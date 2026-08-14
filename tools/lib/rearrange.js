// Temporary, deterministic song-rearrangement recipes.
//
// A recipe names ranges in the song's transport units (sixteenths) and says how
// many times each range is heard in the new output.  It deliberately contains no
// note data: the live engine resolves the current song/mix at playback time, so a
// recipe remains small, readable, and safe to discard without changing a song.

export const REARRANGE_KIND = 'mashenstein-rearrangement';
export const REARRANGE_VERSION = 1;
export const REARRANGE_GRID = 'sixteenth';
export const REARRANGE_EXTREMENESS_DEFAULT = 0.35;
// The generator API keeps the full musical interval palette by default. The mixer
// deliberately starts lower and lets the player dial the lift back up before Generate.
export const REARRANGE_TRANSPOSE_DEFAULT = 1;
export const REARRANGE_PATTERN_DEFAULT = 0.5;
// New recipes move a whole pitched section by a gentle whole tone, perfect fourth, or
// perfect fifth. The older values remain accepted when loading a saved v1 file, so a
// recipe made before this change does not become unusable; generation never chooses
// octave jumps now.
export const REARRANGE_TRANSPOSES = Object.freeze([-12, -7, -5, -2, 0, 2, 5, 7, 12]);
export const REARRANGE_GENERATED_TRANSPOSES = Object.freeze([-7, -5, -2, 2, 5, 7]);
// Rearrange can optionally replace authored percussion triggers with a small,
// deterministic four-on-the-floor kit.  Keep this in the recipe rather than in the
// song bank so the normal song, exports, and saved arrangements remain untouched.
export const REARRANGE_DRUM_MODES = Object.freeze(['original', 'basic4']);

export const REARRANGE_FORM_ROLES = Object.freeze([
  'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro',
]);

const PHRASE_STEPS = 64; // four bars at sixteen sixteenths per bar

const PHRASE_LENGTH_WEIGHTS = Object.freeze([
  [1, 2], [2, 4], [4, 7], [8, 34], [16, 42], [32, 10], [64, 1],
]);

const int = (value) => Number.isInteger(value) ? value : null;

function clampExtremeness(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(1, number))
    : REARRANGE_EXTREMENESS_DEFAULT;
}

function clampControl(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function repeatWeights(patterning = REARRANGE_PATTERN_DEFAULT) {
  const amount = clampControl(patterning, REARRANGE_PATTERN_DEFAULT);
  // A high Patterning setting makes two-pass cells and occasional three/four-pass
  // figures more likely; a low setting leaves more room for one-off source changes.
  return [
    [1, 58 - amount * 28],
    [2, 28 + amount * 22],
    [3, 10 + amount * 4],
    [4, 4 + amount * 2],
  ];
}

/** Return the session-only drum treatment carried by a recipe. */
export function rearrangementDrumMode(recipe) {
  return recipe?.drums == null ? 'original' : recipe.drums;
}

// A cheap, allocation-free hash for the generated kit.  It deliberately mixes the
// recipe seed, output sixteenth, and lane name so a loop repeats exactly while each
// percussion voice gets its own little variation.
function drumRandom(lane, step, seed = 0) {
  let hash = (Number(seed) >>> 0) ^ Math.imul((Math.floor(step) + 1) | 0, 0x9E3779B1);
  const name = String(lane || '');
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 0x45D9F3B);
    hash ^= hash >>> 16;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x45D9F3B);
  hash = Math.imul(hash ^ (hash >>> 13), 0x45D9F3B);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000;
}

/**
 * The musical, steady replacement pattern used by the Rearrange drum mode.
 *
 * `step` is the output transport position, not the mapped source position. Integer
 * sixteenths carry the hits; 32nd-only scheduler passes stay silent. The kick is a
 * straight four-on-the-floor, snare/clap land only on beats 2 and 4, and hats provide
 * the eighth-note grid. Open hats, rims, toms and crashes supply the occasional fill
 * without moving the backbeat.
 */
export function rearrangementDrumHit(lane, step, seed = 0) {
  if (!Number.isInteger(step)) return false;
  const phase = ((step % 16) + 16) % 16;
  const chance = drumRandom(lane, step, seed);
  switch (String(lane || '')) {
    case 'kick':
      return phase % 4 === 0;
    case 'snare':
      return phase === 4 || phase === 12;
    case 'clap':
      return phase === 4 || phase === 12;
    case 'rim':
      return (phase === 2 || phase === 10) && chance < 0.18;
    case 'hats':
      return phase % 2 === 0 || chance < 0.12;
    case 'ohats':
      return (phase === 6 || phase === 14) && chance < 0.68;
    case 'crash':
      return phase === 0 && chance < 0.32;
    case 'tom':
      return (phase === 3 || phase === 7 || phase === 11 || phase === 15) && chance < 0.24;
    default:
      return phase % 4 === 0 && chance < 0.3;
  }
}

/** A small seeded PRNG. The bitwise operations intentionally keep the state uint32. */
export function seededRandom(seed) {
  let state = (Number(seed) >>> 0);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function randomSeed(random = Math.random) {
  return (Math.floor(Math.max(0, Math.min(0.9999999999999999, Number(random()) || 0))
    * 0x100000000) >>> 0);
}

const weighted = (items, random) => {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let pick = random() * total;
  for (const [value, weight] of items) {
    pick -= weight;
    if (pick < 0) return value;
  }
  return items[items.length - 1][0];
};

function sourceStart(maxStart, random, extremeness = REARRANGE_EXTREMENESS_DEFAULT) {
  if (maxStart <= 0) return 0;
  let start = Math.floor(random() * (maxStart + 1));
  const intensity = clampExtremeness(extremeness);
  // A smooth recipe favours whole-bar starts. The wild end keeps the original
  // beat-weighted behavior, with occasional odd sixteenth boundaries.
  const snapUnit = intensity < 0.34 ? 16 : 4;
  const snapChance = 0.98 - intensity * 0.28;
  if (random() < snapChance) start = Math.floor(start / snapUnit) * snapUnit;
  return Math.min(maxStart, start);
}

function operationEqual(a, b) {
  return !!a && !!b && a.from === b.from && a.length === b.length
    && a.repeats === b.repeats && a.transpose === b.transpose;
}

function anchoredOperations(anchor, sectionSteps, sourceSteps) {
  if (!Array.isArray(anchor?.operations) || !anchor.operations.length) return null;
  let total = 0;
  const operations = [];
  for (const raw of anchor.operations) {
    const from = int(raw?.from);
    const length = int(raw?.length);
    const repeats = int(raw?.repeats);
    const transpose = raw?.transpose == null ? 0 : int(raw.transpose);
    if (from == null || length == null || repeats == null || transpose == null
      || from < 0 || length < 1 || from + length > sourceSteps
      || repeats < 1 || repeats > 4 || !REARRANGE_TRANSPOSES.includes(transpose)) return null;
    total += length * repeats;
    operations.push({ from, length, repeats, transpose });
  }
  return total === sectionSteps ? operations : null;
}

function findAnchor(anchors, sectionIndex, section) {
  if (!Array.isArray(anchors)) return null;
  return anchors.find((anchor) => anchor?.index === sectionIndex
    && anchor.steps === section.steps)
    || anchors.find((anchor) => anchor?.role === section.role
      && anchor.steps === section.steps)
    || null;
}

function formRoles(units) {
  if (units <= 1) return ['Verse'];
  if (units === 2) return ['Verse', 'Chorus'];
  if (units === 3) return ['Verse', 'Chorus', 'Bridge'];
  if (units === 4) return ['Intro', 'Verse', 'Chorus', 'Verse'];
  if (units === 5) return ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus'];
  if (units === 6) return ['Intro', 'Verse', 'Chorus', 'Verse', 'Bridge', 'Chorus'];
  if (units === 7) return ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'];
  const roles = ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'];
  const extension = ['Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'];
  while (roles.length < units - 1) roles.push(extension[(roles.length - 7) % extension.length]);
  roles.push('Outro');
  return roles;
}

function formFor(sourceSteps) {
  const units = Math.floor(sourceSteps / PHRASE_STEPS);
  const remainder = sourceSteps % PHRASE_STEPS;
  const roles = formRoles(units);
  const sections = roles.map((role) => ({ role, name: role, steps: PHRASE_STEPS }));
  if (!units) sections[0].steps = sourceSteps;
  else if (remainder) sections.push({ role: 'Outro', name: 'Outro', steps: remainder });
  return sections;
}

function profileScore(profile, start, span) {
  if (!Array.isArray(profile) || !profile.length) return null;
  const first = Math.max(0, Math.floor(start / 16));
  const count = Math.max(1, Math.ceil(span / 16));
  let total = 0;
  let seen = 0;
  for (let i = 0; i < count && first + i < profile.length; i++) {
    const value = Number(profile[first + i]);
    if (Number.isFinite(value)) { total += value; seen++; }
  }
  return seen ? total / seen : null;
}

function sourceCandidates(sourceSteps, span) {
  const maxStart = Math.max(0, sourceSteps - span);
  const out = [];
  for (let start = 0; start <= maxStart; start += PHRASE_STEPS) out.push(start);
  if (out[out.length - 1] !== maxStart) out.push(maxStart);
  return out.length ? out : [0];
}

function candidateBlocked(start, span, blocked) {
  return Array.isArray(blocked) && blocked.some((entry) => {
    const source = int(entry?.source);
    const from = int(entry?.from);
    return (source != null && start === source)
      || (from != null && from >= start && from < start + span);
  });
}

function chooseSource(role, candidates, span, profile, used, random, blocked = null,
  extremeness = REARRANGE_EXTREMENESS_DEFAULT) {
  const availableCandidates = candidates.filter((start) => !candidateBlocked(start, span, blocked));
  const candidatePool = availableCandidates.length ? availableCandidates : candidates;
  if (role === 'Intro') return candidatePool[0];
  if (role === 'Outro') return candidatePool[candidatePool.length - 1];
  const scored = candidatePool.map((start, index) => ({
    start,
    index,
    score: profileScore(profile, start, span),
  }));
  const hasProfile = scored.some((entry) => entry.score != null);
  const preferred = role === 'Chorus' ? 1 : role === 'Verse' ? -1 : 0;
  scored.sort((a, b) => {
    if (hasProfile && a.score !== b.score) return preferred * (b.score - a.score);
    // With no density profile, later source phrases make a useful chorus contrast,
    // while verses favour the opening material. The random pick below still keeps
    // each recipe seed different.
    if (role === 'Chorus' && a.start !== b.start) return b.start - a.start;
    if (role === 'Verse' && a.start !== b.start) return a.start - b.start;
    return a.index - b.index;
  });
  const available = scored.filter((entry) => !candidateBlocked(entry.start, span, blocked));
  const choices = available.length ? available : scored;
  const fresh = choices.filter((entry) => !used.has(entry.start));
  const intensity = clampExtremeness(extremeness);
  const pool = (fresh.length ? fresh : choices)
    .slice(0, Math.max(1, Math.ceil(choices.length * (0.18 + intensity * 0.27))));
  return pool[Math.floor(random() * pool.length)].start;
}

function findAvoid(avoid, sectionIndex, section) {
  if (!Array.isArray(avoid)) return null;
  return avoid.find((anchor) => anchor?.index === sectionIndex
    && anchor.steps === section.steps) || null;
}

function chooseTranspose(role, random, extremeness = REARRANGE_EXTREMENESS_DEFAULT,
  transposeAmount = REARRANGE_TRANSPOSE_DEFAULT) {
  // Keep the occasional shift phrase-wide. A chorus landing by a whole tone, fourth,
  // or fifth is a recognisable lift; transposing every tiny slice independently is not.
  const intensity = clampExtremeness(extremeness);
  const amount = clampControl(transposeAmount, REARRANGE_TRANSPOSE_DEFAULT);
  if (role === 'Intro' || role === 'Outro' || amount <= 0) return 0;
  const chance = (0.02 + intensity * 0.18) * (0.12 + amount * 0.88);
  if (random() >= chance) return 0;
  const choices = amount < 0.34
    ? [-2, 2]
    : amount < 0.7
      ? [-5, -2, 2, 5]
      : REARRANGE_GENERATED_TRANSPOSES;
  return weighted(choices.map((value) => [value, 1]), random);
}

function sectionOperations(sectionSteps, sourceBase, sourceSpan, transpose, random, previous = null,
  favourites = [], extremeness = REARRANGE_EXTREMENESS_DEFAULT,
  patterning = REARRANGE_PATTERN_DEFAULT) {
  const intensity = clampExtremeness(extremeness);
  const pattern = clampControl(patterning, REARRANGE_PATTERN_DEFAULT);
  // Favourites are exact source slices the player asked to hear in every new recipe.
  // They consume output space once, then the remaining space is filled with the normal
  // musical cell/loop choices. Keep them untransposed so the selected phrase remains
  // recognisable; the surrounding filler can still carry the section's gentle lift.
  if (Array.isArray(favourites) && favourites.length) {
    const fixed = favourites.map((favourite) => ({
      from: favourite.from,
      length: favourite.length,
      repeats: 1,
      transpose: 0,
      favourite: true,
    }));
    const used = fixed.reduce((sum, operation) => sum + operation.length, 0);
    const remaining = sectionSteps - used;
    if (remaining <= 0) return fixed;
    const filler = sectionOperations(remaining, sourceBase, sourceSpan, transpose, random,
      fixed[fixed.length - 1], [], intensity, pattern);
    return fixed.concat(filler);
  }
  // A four-bar section is more useful as a pattern of smaller cells than as one
  // unbroken two-bar grab. The common case alternates two adjacent half-bars (or
  // bars) and then repeats that pair: A, B, A, B. This keeps the phrase musical while
  // making the rearrangement audibly different from simply looping a long excerpt.
  if (sectionSteps >= 32 && random() < Math.min(0.95, 0.28 + intensity * 0.34 + pattern * 0.25)) {
    const cellChoices = [
      [8, 4 + intensity * 58],
      [16, 40],
      [32, (1 - intensity) * 20],
      [64, (1 - intensity) * 12],
    ].filter(([value, weight]) => weight > 0 && sectionSteps % value === 0
      && value <= sourceSpan);
    if (cellChoices.length) {
      const length = weighted(cellChoices, random);
      const maxStart = Math.max(0, sourceSpan - length);
      const pairStartMax = Math.max(0, sourceSpan - length * 2);
      const first = sourceStart(pairStartMax || maxStart, random, intensity);
      let second = pairStartMax ? first + length : sourceStart(maxStart, random, intensity);
      if (second === first && maxStart > 0) second = (first + length) % (maxStart + 1);
      const operations = [];
      for (let output = 0; output < sectionSteps; output += length) {
        const fromOffset = ((output / length) % 2) ? second : first;
        const operation = { from: sourceBase + fromOffset, length, repeats: 1, transpose };
        const prior = operations[operations.length - 1] || previous;
        if (operationEqual(prior, operation)) {
          operation.from = sourceBase + (fromOffset + length) % (maxStart + 1);
          // If the transpose dial is Off, keep the source key rather than using a
          // pitch change merely to disguise a duplicate at a one-cell boundary.
          if (operationEqual(prior, operation) && transpose !== 0) {
            operation.transpose = operation.transpose === 0 ? 2 : 0;
          }
        }
        operations.push(operation);
      }
      return operations;
    }
  }
  // Most sections are one recognisable loop: a four-bar phrase, a two-bar phrase
  // twice, or a one-bar figure four times. Only a minority opens up into smaller
  // collage cuts, so the form remains audible instead of becoming a list of tiny
  // unrelated edits.
  const loopChoices = PHRASE_LENGTH_WEIGHTS
    .map(([value, weight]) => [value, weight * (
      value >= 32 ? 1 + (1 - intensity) * 8
        : value === 16 ? 1 + (1 - intensity) * 2 : 1)])
    .filter(([value]) => value <= sourceSpan
      && value <= sectionSteps && sectionSteps / value <= 4);
  if (loopChoices.length && random() < 0.96 - intensity * 0.12) {
    const length = weighted(loopChoices, random);
    const repeats = sectionSteps / length;
    const offset = sourceStart(sourceSpan - length, random, intensity);
    const operation = { from: sourceBase + offset, length, repeats, transpose };
    if (!operationEqual(previous, operation)) return [operation];
    const shifted = sourceSpan > length
      ? sourceBase + ((offset + 4) % (sourceSpan - length + 1)) : operation.from;
    if (shifted !== operation.from) return [{ ...operation, from: shifted }];
    return transpose === 0
      ? [operation]
      : [{ ...operation, transpose: operation.transpose === 0 ? 2 : 0 }];
  }
  const operations = [];
  let output = 0;
  while (output < sectionSteps) {
    const remaining = sectionSteps - output;
    const choices = PHRASE_LENGTH_WEIGHTS.filter(([value]) => value <= remaining && value <= sourceSpan);
    const lengths = choices.length ? choices : [[Math.min(1, remaining), 1]];
    let length = weighted(lengths, random);
    // Glitches are still possible, but only as an occasional subdivision inside a
    // phrase. The normal choices are beat/half-bar/bar lengths.
    if (remaining > 8 && random() < 0.01 + intensity * 0.09) {
      const glitches = [[1, 4], [2, 6], [4, 10], [8, 12]].filter(([value]) => value <= remaining && value <= sourceSpan);
      if (glitches.length) length = weighted(glitches, random);
    }
    const maxRepeats = Math.min(4, Math.max(1, Math.floor(remaining / length)));
    const repeats = weighted(repeatWeights(pattern).filter(([value]) => value <= maxRepeats), random);
    const offset = sourceStart(sourceSpan - length, random, intensity);
    const op = { from: sourceBase + offset, length, repeats, transpose };
    const previousOp = operations[operations.length - 1] || previous;
    if (operationEqual(previousOp, op)) {
      if (sourceSpan > length) op.from = sourceBase + ((offset + 4) % (sourceSpan - length + 1));
      else if (transpose !== 0) op.transpose = op.transpose === 0 ? 2 : 0;
    }
    operations.push(op);
    output += length * repeats;
  }
  return operations;
}

function validateForm(form, sourceSteps) {
  if (form == null) return null;
  if (!Array.isArray(form) || !form.length) throw new Error('Rearrange JSON has an invalid form');
  let cursor = 0;
  const out = form.map((raw, index) => {
    const start = int(raw?.start);
    const end = int(raw?.end);
    const source = raw?.source == null ? null : int(raw.source);
    const role = typeof raw?.role === 'string' ? raw.role : '';
    const name = typeof raw?.name === 'string' ? raw.name : '';
    if (start == null || end == null || !name || !REARRANGE_FORM_ROLES.includes(role)) {
      throw new Error(`Form section ${index + 1} has invalid fields`);
    }
    if (start !== cursor || end <= start || end > sourceSteps) {
      throw new Error(`Form section ${index + 1} is not a contiguous output range`);
    }
    if (source != null && (source < 0 || source >= sourceSteps)) {
      throw new Error(`Form section ${index + 1} has an invalid source range`);
    }
    cursor = end;
    return { name, role, start, end, ...(source == null ? {} : { source }) };
  });
  if (cursor !== sourceSteps) throw new Error('Rearrange form does not cover the output');
  return out;
}

/**
 * Generate a same-length recipe for a source song.
 *
 * The source is sampled independently for each operation (wild collage), while
 * slice lengths and repeats are weighted toward musical groupings.  The result is
 * deterministic for a given seed and has no dependency on browser APIs.
 */
export function generateRearrangement(sourceSteps, {
  seed = randomSeed(), random = null, sourceProfile = null, anchors = null, avoid = null,
  favourites = null, extremeness = REARRANGE_EXTREMENESS_DEFAULT,
  transposeAmount = REARRANGE_TRANSPOSE_DEFAULT, patterning = REARRANGE_PATTERN_DEFAULT,
} = {}) {
  if (!Number.isInteger(sourceSteps) || sourceSteps <= 0) {
    throw new RangeError('sourceSteps must be a positive integer');
  }
  const rng = random || seededRandom(seed);
  const actualSeed = Number(seed) >>> 0;
  const intensity = clampExtremeness(extremeness);
  const transpose = clampControl(transposeAmount, REARRANGE_TRANSPOSE_DEFAULT);
  const pattern = clampControl(patterning, REARRANGE_PATTERN_DEFAULT);
  const operations = [];
  const form = [];
  const roleSources = new Map();
  const roleTemplates = new Map();
  const usedSources = new Set();
  const sections = formFor(sourceSteps);
  const phraseSpan = Math.min(PHRASE_STEPS, sourceSteps);
  const candidates = sourceCandidates(sourceSteps, phraseSpan);
  const normalizedFavourites = Array.isArray(favourites)
    ? favourites.map((raw) => ({
      from: int(raw?.from), length: int(raw?.length),
    })).filter((favourite) => favourite.from != null && favourite.length != null
      && favourite.from >= 0 && favourite.length > 0
      && favourite.from + favourite.length <= sourceSteps)
      .filter((favourite, index, list) => list.findIndex((other) =>
        other.from === favourite.from && other.length === favourite.length) === index)
    : [];
  const favouriteTotal = normalizedFavourites.reduce((sum, favourite) => sum + favourite.length, 0);
  if (favouriteTotal > sourceSteps) {
    throw new RangeError('Rearrange favourites exceed the song duration');
  }
  // Fit the requested slices into real form sections. Longest-first keeps a selected
  // half-bar/bar together even when the source ends with a shorter outro section.
  const favouriteBuckets = sections.map(() => []);
  const remainingSectionSteps = sections.map((section) => section.steps);
  for (const favourite of [...normalizedFavourites].sort((a, b) => b.length - a.length)) {
    const sectionIndex = remainingSectionSteps.findIndex((remaining) => remaining >= favourite.length);
    if (sectionIndex < 0) throw new RangeError('A Rearrange favourite does not fit the song form');
    favouriteBuckets[sectionIndex].push(favourite);
    remainingSectionSteps[sectionIndex] -= favourite.length;
  }
  let output = 0;
  let previous = null;
  for (const [sectionIndex, section] of sections.entries()) {
    const rejected = findAvoid(avoid, sectionIndex, section);
    let source = roleSources.get(section.role);
    if (source == null || rejected) {
      source = chooseSource(section.role, candidates, phraseSpan, sourceProfile, usedSources, rng,
        rejected ? [rejected] : null, intensity);
      roleSources.set(section.role, source);
      usedSources.add(source);
    }
    const sourceSpan = Math.min(phraseSpan, sourceSteps - source);
    const preserved = anchoredOperations(findAnchor(anchors, sectionIndex, section),
      section.steps, sourceSteps);
    const hasFavourites = favouriteBuckets[sectionIndex].length > 0;
    let sectionOps = preserved && !hasFavourites ? { steps: section.steps, operations: preserved }
      : (rejected ? null : roleTemplates.get(section.role));
    if (preserved && !hasFavourites) {
      // A kept Verse/Chorus should remain the motif for its returning sections too;
      // that preserves the form's identity while the unkept roles are regenerated.
      roleTemplates.set(section.role, sectionOps);
    } else if (!sectionOps || sectionOps.steps !== section.steps || hasFavourites) {
      const sectionTranspose = chooseTranspose(section.role, rng, intensity, transpose);
      sectionOps = {
        steps: section.steps,
        operations: sectionOperations(section.steps, source, sourceSpan, sectionTranspose, rng, previous,
          favouriteBuckets[sectionIndex], intensity, pattern),
      };
      // A favourite is a one-shot user request, not a new Verse/Chorus template. Do
      // not silently repeat it in every returning section of the same role.
      if (!hasFavourites) roleTemplates.set(section.role, sectionOps);
    } else {
      sectionOps = {
        steps: sectionOps.steps,
        operations: sectionOps.operations.map((operation) => ({ ...operation })),
      };
    }
    const sectionStart = output;
    const sectionOperationStart = operations.length;
    for (const operation of sectionOps.operations) {
      const copy = { ...operation };
      const prior = operations[operations.length - 1];
      if (operationEqual(prior, copy) && !copy.favourite) {
        const maxOffset = Math.max(0, sourceSpan - copy.length);
        const offset = copy.from - source;
        copy.from = source + (maxOffset ? (offset + 4) % (maxOffset + 1) : 0);
        if (operationEqual(prior, copy) && transpose > 0) {
          copy.transpose = copy.transpose === 0 ? 2 : 0;
        }
      }
      const outputOperation = { ...copy };
      delete outputOperation.favourite;
      operations.push(outputOperation);
      output += copy.length * copy.repeats;
      previous = outputOperation;
    }
    const sectionOutputOperations = operations.slice(sectionOperationStart);
    form.push({
      name: section.name,
      role: section.role,
      start: sectionStart,
      end: output,
      source: sectionOutputOperations.length
        ? Math.min(...sectionOutputOperations.map((operation) => operation.from))
        : source,
    });
  }
  return {
    kind: REARRANGE_KIND,
    version: REARRANGE_VERSION,
    source: { steps: sourceSteps },
    seed: actualSeed,
    grid: REARRANGE_GRID,
    form,
    operations,
  };
}

function splitOperation(operation) {
  if (operation.length < 2) return [operation];
  const firstLength = Math.floor(operation.length / 2);
  const secondLength = operation.length - firstLength;
  const out = [];
  // Expand the repeat count so the two halves stay interleaved: A/B/A/B rather
  // than all of A followed by all of B. This is the useful musical result when
  // a joined eighth- or sixteenth-note cell is chopped into pieces.
  for (let repeat = 0; repeat < operation.repeats; repeat++) {
    out.push(
      { ...operation, from: operation.from, length: firstLength, repeats: 1 },
      { ...operation, from: operation.from + firstLength, length: secondLength, repeats: 1 },
    );
  }
  return out;
}

function rerollFrom(operation, sourceSteps, random) {
  const maxStart = Math.max(0, sourceSteps - operation.length);
  if (!maxStart) return operation.from;
  let next = operation.from;
  for (let attempt = 0; attempt < 8 && next === operation.from; attempt++) {
    next = Math.floor(random() * (maxStart + 1));
  }
  return next === operation.from ? (operation.from + 4) % (maxStart + 1) : next;
}

function compactAdjacentOperations(operations) {
  const out = [];
  for (const operation of operations) {
    const previous = out[out.length - 1];
    if (!previous || previous.from !== operation.from || previous.length !== operation.length
      || previous.transpose !== operation.transpose) {
      out.push({ ...operation });
      continue;
    }
    const room = 4 - previous.repeats;
    const joined = Math.min(room, operation.repeats);
    previous.repeats += joined;
    if (joined < operation.repeats) {
      out.push({ ...operation, repeats: operation.repeats - joined });
    }
  }
  return out;
}

/** Replace selected output time with a neighbouring slice, preserving song length. */
function removeSelectedOperations(operations, selected, sourceSteps, random) {
  const templates = operations
    .map((operation, index) => selected.has(index) ? null : operation);
  if (!templates.some(Boolean)) return null;
  const replacement = operations.map((operation, index) => {
    if (!selected.has(index)) return { ...operation };
    let template = null;
    for (let distance = 1; distance < operations.length && !template; distance++) {
      const left = index - distance;
      const right = index + distance;
      if (left >= 0 && !selected.has(left)) template = operations[left];
      else if (right < operations.length && !selected.has(right)) template = operations[right];
    }
    if (!template) return { ...operation };
    const duration = operation.length * operation.repeats;
    // When the neighbour divides the removed time, let it fill the gap as one compact
    // repeated row. Otherwise retain the selected row's shape but point it at new
    // neighbouring material; either way the old source slice is gone and duration stays
    // exact.
    if (duration % template.length === 0 && duration / template.length <= 4) {
      return {
        ...template,
        repeats: duration / template.length,
      };
    }
    return {
      ...operation,
      from: rerollFrom({ from: template.from, length: operation.length }, sourceSteps, random),
      transpose: template.transpose,
    };
  });
  return compactAdjacentOperations(replacement);
}

/**
 * Apply a small, exact-duration edit to selected recipe rows.
 *
 * These are audition controls rather than song edits. Every supported transform
 * preserves each selected row's output duration, so the recipe remains the same
 * length and its form boundaries stay valid.
 */
export function transformRearrangement(recipe, indices, action, { seed = recipe?.seed || 0 } = {}) {
  const sourceSteps = int(recipe?.source?.steps);
  if (!sourceSteps || !Array.isArray(recipe?.operations) || !recipe.operations.length) {
    throw new Error('Rearrange has no operations to transform');
  }
  const selected = new Set((Array.isArray(indices) ? indices : [indices])
    .map((index) => int(index)).filter((index) => index != null && index >= 0
      && index < recipe.operations.length));
  if (!selected.size) throw new Error('Select one or more Rearrange slices first');
  const random = seededRandom(seed);
  if (action === 'remove') {
    const operations = removeSelectedOperations(recipe.operations, selected, sourceSteps, random);
    if (!operations) return { recipe: { ...recipe }, changed: 0 };
    return {
      recipe: {
        ...recipe,
        seed: Number(seed) >>> 0,
        operations,
      },
      changed: selected.size,
    };
  }
  let changed = 0;
  const operations = [];
  recipe.operations.forEach((raw, index) => {
    const operation = { ...raw };
    if (!selected.has(index)) { operations.push(operation); return; }
    let replacement = [operation];
    if (action === 'split') replacement = splitOperation(operation);
    else if (action === 'unroll' && operation.repeats > 1) {
      replacement = new Array(operation.repeats).fill(null)
        .map(() => ({ ...operation, repeats: 1 }));
    }
    else if (action === 'double-repeats' && operation.length % 2 === 0
      && operation.length >= 2 && operation.repeats * 2 <= 4) {
      replacement = [{ ...operation, length: operation.length / 2, repeats: operation.repeats * 2 }];
    } else if (action === 'half-repeats' && operation.repeats % 2 === 0
      && operation.from + operation.length * 2 <= sourceSteps) {
      replacement = [{ ...operation, length: operation.length * 2, repeats: operation.repeats / 2 }];
    } else if (action === 'reroll') {
      replacement = [{ ...operation, from: rerollFrom(operation, sourceSteps, random) }];
    }
    if (replacement.length !== 1 || !operationEqual(replacement[0], operation)) changed++;
    operations.push(...replacement);
  });
  return {
    recipe: {
      ...recipe,
      seed: Number(seed) >>> 0,
      operations,
    },
    changed,
  };
}

/** Validate and clone a recipe before it reaches the audio engine. */
export function validateRearrangement(value, sourceSteps, { songId = null } = {}) {
  if (!value || value.kind !== REARRANGE_KIND || value.version !== REARRANGE_VERSION) {
    throw new Error('Not a supported Rearrange JSON file');
  }
  if (value.grid !== REARRANGE_GRID) throw new Error('Rearrange JSON uses an unsupported grid');
  if (!Number.isInteger(sourceSteps) || sourceSteps <= 0) {
    throw new RangeError('The current song has no playable steps');
  }
  if (value.source?.steps !== sourceSteps) {
    throw new Error(`This recipe needs ${value.source?.steps || '?'} steps; the current song has ${sourceSteps}`);
  }
  const form = validateForm(value.form, sourceSteps);
  if (songId && value.source?.song && value.source.song !== songId) {
    throw new Error(`This recipe belongs to ${value.source.song}`);
  }
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff) {
    throw new Error('Rearrange JSON has an invalid seed');
  }
  const drums = value.drums == null ? 'original' : value.drums;
  if (!REARRANGE_DRUM_MODES.includes(drums)) {
    throw new Error('Rearrange JSON has an unsupported drum mode');
  }
  if (!Array.isArray(value.operations) || !value.operations.length) {
    throw new Error('Rearrange JSON has no operations');
  }
  let total = 0;
  const operations = value.operations.map((raw, index) => {
    const from = int(raw?.from);
    const length = int(raw?.length);
    const repeats = int(raw?.repeats);
    const transpose = raw?.transpose == null ? 0 : int(raw.transpose);
    if (from == null || length == null || repeats == null || transpose == null) {
      throw new Error(`Operation ${index + 1} has a non-integer field`);
    }
    if (from < 0 || length < 1 || from + length > sourceSteps) {
      throw new Error(`Operation ${index + 1} is outside the source song`);
    }
    if (repeats < 1 || repeats > 4) throw new Error(`Operation ${index + 1} has invalid repeats`);
    if (!REARRANGE_TRANSPOSES.includes(transpose)) {
      throw new Error(`Operation ${index + 1} has an unsupported transpose`);
    }
    total += length * repeats;
    return { from, length, repeats, transpose };
  });
  if (total !== sourceSteps) {
    throw new Error(`Rearrange output is ${total} steps, expected ${sourceSteps}`);
  }
  return {
    kind: REARRANGE_KIND,
    version: REARRANGE_VERSION,
    source: {
      ...(value.source?.song ? { song: String(value.source.song) } : {}),
      ...(value.source?.title ? { title: String(value.source.title) } : {}),
      steps: sourceSteps,
    },
    seed: value.seed >>> 0,
    grid: REARRANGE_GRID,
    ...(drums === 'original' ? {} : { drums }),
    ...(form ? { form } : {}),
    operations,
  };
}

/** Return the source mapping and operation/repeat row for an output step. */
export function rearrangementPosition(recipe, outputStep) {
  const total = recipe?.source?.steps || 0;
  if (!(total > 0) || !Number.isFinite(outputStep)) return null;
  const wrapped = ((outputStep % total) + total) % total;
  let cursor = 0;
  for (let index = 0; index < recipe.operations.length; index++) {
    const operation = recipe.operations[index];
    const duration = operation.length * operation.repeats;
    if (wrapped < cursor + duration || index === recipe.operations.length - 1) {
      const local = wrapped - cursor;
      const repeat = Math.min(operation.repeats - 1, Math.floor(local / operation.length));
      return {
        outputStep: wrapped,
        sourceStep: operation.from + (local % operation.length),
      operationIndex: index,
      repeatIndex: repeat,
      operation,
      outputStart: cursor,
      outputEnd: cursor + duration,
      ...(Array.isArray(recipe.form) ? (() => {
        const formIndex = recipe.form.findIndex((section) => wrapped >= section.start && wrapped < section.end);
        return formIndex < 0 ? {} : { formIndex, form: recipe.form[formIndex] };
      })() : {}),
    };
    }
    cursor += duration;
  }
  return null;
}

export function rearrangementOutputSteps(recipe) {
  return recipe?.operations?.reduce((sum, operation) => sum + operation.length * operation.repeats, 0) || 0;
}
