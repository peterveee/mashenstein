// What a bass report means, in words: for each band a song carries noticeably more
// or less of than the finished cabinets, what you would HEAR, and what to reach for
// on the desk if you want to change it. Used by tools/bass-report.js, which prints it
// and writes it into the report file the desk's /reports page draws.
//
// Advice, not orders. A crypt song can be darker than a neon one on purpose; the
// report only says where a song sits against the others. Every suggestion names the
// desk's own controls — the Channel EQ card's bands (src/engine/effects.js
// PEQ_BANDS: LOW shelf 120 Hz, LOW-MID 500, MID 1k, HIGH-MID 2k, HIGH shelf 6k) — so
// the words on the page are the words on the strip.

// Per band: what more / less of it sounds like, and the move that changes it.
// `strips` is where that band usually lives in these songs, used when no lane
// breakdown exists to name the actual strip.
const BAND_TALK = {
  sub: {
    more: 'sub-heavy: boom and weight under everything. Phone speakers barely reproduce it; on headphones it can swamp the kick',
    less: 'no sub weight: punchy, but light underneath',
    cut: 'a LOW shelf cut (120 Hz) on the strip carrying the sub, or pull that strip down',
    boost: 'a LOW shelf boost (120 Hz) on the kick or bass strip',
    strips: 'kick or bass',
  },
  bass: {
    more: 'heavy bass: the kick and bass line dominate the mix',
    less: 'light bass: the kick and bass line sit back',
    cut: 'a LOW shelf cut (120 Hz) on the bass or kick strip, or its fader down',
    boost: 'a LOW shelf boost (120 Hz) on the bass strip, or its fader up',
    strips: 'bass or kick',
  },
  'up-bass': {
    more: 'thick low end: can turn muddy and blur the bass line',
    less: 'little warmth: the low end is lean',
    cut: 'a LOW-MID cut set down toward 200 Hz on the bass, chords or pads',
    boost: 'a LOW-MID boost set down toward 200 Hz on the bass or chords',
    strips: 'bass, chords or pads',
  },
  'low-mid': {
    more: 'boxy or honky: the body of the mix is crowded',
    less: 'scooped: the body of the mix is thin, which reads as "light" even when the bass itself is fine',
    cut: 'a LOW-MID cut (500 Hz) on the chords, pads or lead',
    boost: 'a LOW-MID boost (500 Hz) on the chords or bass, or bring the bright parts down instead',
    strips: 'chords, pads or lead',
  },
  mid: {
    more: 'forward mids: the lead pushes out, can turn nasal',
    less: 'recessed mids: the lead sits back',
    cut: 'a MID cut (1 kHz) on the lead',
    boost: 'a MID boost (1 kHz) on the lead, or its fader up',
    strips: 'lead',
  },
  presence: {
    more: 'bright and edgy. This is also where most sound effects live, so cues compete with the music here',
    less: 'dark or muffled. Sound effects cut through easily, but the song can sound veiled next to the others',
    cut: 'a HIGH-MID cut (2 kHz, pushed up toward 3–4k) on the lead or hats',
    boost: 'a HIGH-MID boost (2 kHz, pushed up toward 3–4k) on the lead or chords',
    strips: 'lead, chords or hats',
  },
  air: {
    more: 'sizzly top: hats and cymbals stand out',
    less: 'dull top: little shimmer',
    cut: 'a HIGH shelf cut (6 kHz) on the hats or cymbals',
    boost: 'a HIGH shelf boost (6 kHz) on the hats or lead',
    strips: 'hats, cymbals or lead',
  },
};

// Past this far under, a band is not quiet, it is empty: nothing in the arrangement
// plays there. The title, with no drums and no hats, reads -38 sub and -39 air, and
// "boost 39 dB" is not advice. EQ can only shape what is played.
const MISSING = -15;
// What part would put something in each band, for the "missing" case.
const PLAYS_HERE = {
  sub: 'a sub bass or a kick with low end', bass: 'a bass line or a kick',
  'up-bass': 'a bass line, low chords or pads', 'low-mid': 'chords, pads or a low lead',
  mid: 'a lead or chords', presence: 'a lead, hats or percussion', air: 'hats, cymbals or a bright lead',
};

// A few words for the whole song, from its two biggest departures.
function character(points) {
  const words = points.slice(0, 2).map((p) => {
    const up = p.dev > 0;
    if (p.missing) return `nothing in the ${p.band}`;
    return {
      sub: up ? 'sub-heavy' : 'thin underneath',
      bass: up ? 'bass-heavy' : 'light on bass',
      'up-bass': up ? 'thick in the low end' : 'lean in the low end',
      'low-mid': up ? 'boxy' : 'scooped',
      mid: up ? 'mid-forward' : 'mid-recessed',
      presence: up ? 'bright' : 'dark',
      air: up ? 'sizzly' : 'dull on top',
    }[p.band];
  });
  return words.length ? `${words.join(' and ')}`.replace(/^./, (c) => c.toUpperCase()) : 'In step with the others';
}

/**
 * @param {{ id: string, levels: number[], hash?: string }} row  one song's band levels
 * @param {number[]} median  the finished cabinets' median per band
 * @param {{ name: string }[]} bands
 * @param {number} flag  dB off the median before a band is worth mentioning
 * @param {object} [lanes]  that song's lane breakdown, if one exists
 */
export function adviseSong(row, median, bands, flag, lanes = null) {
  const stale = lanes && row.hash && lanes.hash !== row.hash;
  const points = row.levels
    .map((v, b) => ({ band: bands[b].name, b, dev: v - median[b] }))
    .filter((p) => Math.abs(p.dev) >= flag)
    .sort((a, c) => Math.abs(c.dev) - Math.abs(a.dev))
    .map((p) => {
      const talk = BAND_TALK[p.band];
      const up = p.dev > 0;
      if (p.dev <= MISSING) {
        return {
          band: p.band,
          dev: Math.round(p.dev * 10) / 10,
          missing: true,
          hear: 'next to nothing here: no part in the arrangement plays this range',
          move: `EQ can’t add what isn’t played. If you want it, it needs a part: ${PLAYS_HERE[p.band]}. If the song is meant to be sparse, leave it`,
          strip: null,
          usual: talk.strips,
        };
      }
      // Name the strip from a lane breakdown when there is one for this band. Only
      // the low bands are broken down, so the upper ones fall back to the usual parts.
      const top = lanes?.rows?.filter((l) => l.shares[p.b] != null)
        .sort((a, c) => c.shares[p.b] - a.shares[p.b])[0];
      const strip = top && top.shares[p.b] >= 25
        ? `${top.key} carries ${top.shares[p.b].toFixed(0)}% of it${stale ? ' (lane breakdown is from before the last change)' : ''}`
        : null;
      return {
        band: p.band,
        dev: Math.round(p.dev * 10) / 10,
        hear: up ? talk.more : talk.less,
        move: up ? talk.cut : talk.boost,
        strip,
        usual: talk.strips,
      };
    });
  const worst = points.length ? Math.abs(points[0].dev) : 0;
  return {
    id: row.id,
    worst,
    headline: character(points),
    points,
    needsLanes: points.some((p) => !p.missing && ['sub', 'bass', 'up-bass'].includes(p.band)) && !lanes,
  };
}

// The same advice as plain text, for the terminal.
export function adviceText(a) {
  if (!a.points.length) return `${a.id}: in step with the others.`;
  const lines = [`${a.id}: ${a.headline}.`];
  for (const p of a.points) {
    lines.push(`  ${p.dev > 0 ? '+' : ''}${p.dev} ${p.band}: ${p.hear}.`);
    lines.push(`      to change it: ${p.move}.${p.strip ? ` ${p.strip}.` : ''}`);
  }
  if (a.needsLanes) lines.push(`  (BASS REPORT with + LANES on ${a.id} names the strip carrying the low end.)`);
  return lines.join('\n');
}
