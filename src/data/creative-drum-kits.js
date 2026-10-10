// Shared kit identities and lane assignments for the mixer, Lab and auditions.
// Sound definitions and measured levels live in voices.js.
export const CREATIVE_DRUM_KITS = [
  {
    "key": "glasshouse",
    "label": "Glasshouse",
    "description": "House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. Crisp and open, with restrained fills.",
    "bpm": 126,
    "lab": false,
    "voices": {
      "kick": "kit_glasshouse_kick",
      "snare": "kit_glasshouse_snare",
      "clap": "kit_glasshouse_clap",
      "hats": "kit_glasshouse_hats",
      "ohats": "kit_glasshouse_ohats",
      "tom": "kit_glasshouse_tom",
      "rim": "kit_glasshouse_rim",
      "crash": "kit_glasshouse_crash"
    }
  },
  {
    "key": "havana-patio",
    "label": "Havana Patio",
    "description": "Latin house: a solid club kick and handclaps, with open conga, woody clave and sandy shaker accents over a four-on-the-floor groove.",
    "bpm": 124,
    "lab": false,
    "voices": {
      "kick": "kit_havana_patio_kick",
      "snare": "kit_havana_patio_snare",
      "clap": "kit_havana_patio_clap",
      "hats": "kit_havana_patio_hats",
      "ohats": "kit_havana_patio_ohats",
      "tom": "kit_havana_patio_tom",
      "rim": "kit_havana_patio_rim",
      "crash": "kit_havana_patio_crash"
    }
  },
  {
    "key": "moon-dust",
    "label": "Moon Dust",
    "description": "Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low tom fills. Weight and space, with no sci-fi pings.",
    "bpm": 126,
    "lab": false,
    "voices": {
      "kick": "kit_moon_dust_kick",
      "snare": "kit_moon_dust_snare",
      "clap": "kit_moon_dust_clap",
      "hats": "kit_moon_dust_hats",
      "ohats": "kit_moon_dust_ohats",
      "tom": "kit_moon_dust_tom",
      "rim": "kit_moon_dust_rim",
      "crash": "kit_moon_dust_crash"
    }
  },
  {
    "key": "neon-origami",
    "label": "Neon Origami",
    "description": "Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright driving cymbals. Tight enough for a busy bassline.",
    "bpm": 138,
    "lab": false,
    "voices": {
      "kick": "kit_neon_origami_kick",
      "snare": "kit_neon_origami_snare",
      "clap": "kit_neon_origami_clap",
      "hats": "kit_neon_origami_hats",
      "ohats": "kit_neon_origami_ohats",
      "tom": "kit_neon_origami_tom",
      "rim": "kit_neon_origami_rim",
      "crash": "kit_neon_origami_crash"
    }
  },
  {
    "key": "pocket-pixel",
    "label": "Pocket Pixel",
    "description": "Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise tails; no drive, crusher or saturation.",
    "bpm": 132,
    "lab": false,
    "voices": {
      "kick": "kit_pocket_pixel_kick",
      "snare": "kit_pocket_pixel_snare",
      "clap": "kit_pocket_pixel_clap",
      "hats": "kit_pocket_pixel_hats",
      "ohats": "kit_pocket_pixel_ohats",
      "tom": "kit_pocket_pixel_tom",
      "rim": "kit_pocket_pixel_rim",
      "crash": "kit_pocket_pixel_crash"
    }
  },
  {
    "key": "rio-lanterns",
    "label": "Rio Lanterns",
    "description": "Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with tambora-style skin percussion and a short metallic agogo accent.",
    "bpm": 126,
    "lab": false,
    "voices": {
      "kick": "kit_rio_lanterns_kick",
      "snare": "kit_rio_lanterns_snare",
      "clap": "kit_rio_lanterns_clap",
      "hats": "kit_rio_lanterns_hats",
      "ohats": "kit_rio_lanterns_ohats",
      "tom": "kit_rio_lanterns_tom",
      "rim": "kit_rio_lanterns_rim",
      "crash": "kit_rio_lanterns_crash"
    }
  },
  {
    "key": "rubber-factory",
    "label": "Rubber Factory",
    "description": "Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. A rolling club groove without cartoon pitch sweeps.",
    "bpm": 128,
    "lab": false,
    "voices": {
      "kick": "kit_rubber_factory_kick",
      "snare": "kit_rubber_factory_snare",
      "clap": "kit_rubber_factory_clap",
      "hats": "kit_rubber_factory_hats",
      "ohats": "kit_rubber_factory_ohats",
      "tom": "kit_rubber_factory_tom",
      "rim": "kit_rubber_factory_rim",
      "crash": "kit_rubber_factory_crash"
    }
  },
  {
    "key": "velvet-basement",
    "label": "Velvet Basement",
    "description": "Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed metallic hats. A relaxed dance-floor pulse.",
    "bpm": 120,
    "lab": false,
    "voices": {
      "kick": "kit_velvet_basement_kick",
      "snare": "kit_velvet_basement_snare",
      "clap": "kit_velvet_basement_clap",
      "hats": "kit_velvet_basement_hats",
      "ohats": "kit_velvet_basement_ohats",
      "tom": "kit_velvet_basement_tom",
      "rim": "kit_velvet_basement_rim",
      "crash": "kit_velvet_basement_crash"
    }
  },
  {
    "key": "80s-pop",
    "label": "Eighties",
    "description": "The 80s pop drum machine, made with synthesis: a short papery kick, a big gated snare with a stick crack, the Big Room clap, sizzly hats and tuned toms, the top rolled off the way an early sampler's was. An impression of the sampled original, not a copy.",
    "bpm": 118,
    "voices": {
      "kick": "kit_80s_pop_kick",
      "snare": "kit_80s_pop_snare",
      "clap": "kit_80s_pop_clap",
      "hats": "kit_80s_pop_hats",
      "ohats": "kit_80s_pop_ohats",
      "tom": "kit_80s_pop_tom",
      "rim": "kit_80s_pop_rim",
      "crash": "kit_80s_pop_crash"
    }
  },
  {
    "key": "breakbeat",
    "label": "Breakbeat",
    "description": "Funk-break drums for jungle, rave and trip-hop, made with synthesis: a loose round kick, a tight ringing snare with a lighter ghost snare in the clap slot, washy hats and a dark crash-ride, pushed into a desk and rolled off at the top.",
    "bpm": 165,
    "voices": {
      "kick": "kit_breakbeat_kick",
      "snare": "kit_breakbeat_snare",
      "clap": "kit_breakbeat_clap",
      "hats": "kit_breakbeat_hats",
      "ohats": "kit_breakbeat_ohats",
      "tom": "kit_breakbeat_tom",
      "rim": "kit_breakbeat_rim",
      "crash": "kit_breakbeat_crash"
    }
  },
  {
    "key": "nes",
    "label": "NES",
    "description": "Console drums in the NES manner: a triangle kick and tom that hold and then cut, raw noise snares falling in straight lines, and a buzzy metallic tick for hats. Rougher than Pocket Pixel; synthesis, not chip-accurate.",
    "bpm": 150,
    "voices": {
      "kick": "kit_nes_kick",
      "snare": "kit_nes_snare",
      "clap": "kit_nes_clap",
      "hats": "kit_nes_hats",
      "ohats": "kit_nes_ohats",
      "tom": "kit_nes_tom",
      "rim": "kit_nes_rim",
      "crash": "kit_nes_crash"
    }
  },
  {
    "key": "simmons",
    "label": "Simmons",
    "description": "The 80s hexagon kit: the library's Simmons kick, snare, mid tom and cymbal, with electronic hats, a noise-heavy second snare in the clap slot and a bent rim tick to match.",
    "bpm": 116,
    "voices": {
      "kick": "sdsKick",
      "snare": "sdsSnare",
      "clap": "kit_simmons_clap",
      "hats": "kit_simmons_hats",
      "ohats": "kit_simmons_ohats",
      "tom": "sdsTomMid",
      "rim": "kit_simmons_rim",
      "crash": "sdsCymbal"
    }
  },
  {
    "key": "neuro",
    "label": "Neuro",
    "description": "Modern drum & bass: a short, hard-clicking kick, a big snare with a ringing body under a held crack, a snappy layering clap, bright tight hats and a metallic ping.",
    "bpm": 174,
    "voices": {
      "kick": "kit_neuro_kick",
      "snare": "kit_neuro_snare",
      "clap": "kit_neuro_clap",
      "hats": "kit_neuro_hats",
      "ohats": "kit_neuro_ohats",
      "tom": "kit_neuro_tom",
      "rim": "kit_neuro_rim",
      "crash": "kit_neuro_crash"
    }
  },
  {
    "key": "brushes",
    "label": "Brushes",
    "description": "A jazz kit played with brushes: a soft felt kick, a brush tap on the snare and a swish in the clap slot, a pedal hat, a bossa cross-stick and a soft ride wash.",
    "bpm": 100,
    "voices": {
      "kick": "kit_brushes_kick",
      "snare": "kit_brushes_snare",
      "clap": "kit_brushes_clap",
      "hats": "kit_brushes_hats",
      "ohats": "kit_brushes_ohats",
      "tom": "kit_brushes_tom",
      "rim": "kit_brushes_rim",
      "crash": "kit_brushes_crash"
    }
  },
  {
    "key": "syndrum-disco",
    "label": "Disco",
    "bpm": 122,
    "description": "Disco and italo played entirely on the drum synth, every slot a pew: a kick that falls from 380 Hz, a pewing snare, a zap for a clap, hats with a tiny flick in them, a long pew for the fills and a wobbling pew for a crash.",
    "voices": {
      "kick": "kit_syndrum_disco_kick",
      "snare": "kit_syndrum_disco_snare",
      "clap": "kit_syndrum_disco_clap",
      "hats": "kit_syndrum_disco_hats",
      "ohats": "kit_syndrum_disco_ohats",
      "tom": "kit_syndrum_disco_tom",
      "rim": "sdHighPew",
      "crash": "kit_syndrum_disco_crash"
    }
  }
];

// `lab: false`: kept off the game's Lab — its mixer and its kit rolls — and on the desk only
// (Peter, 10 Oct 2026: the first eight, "not the named kits like glasshouse").
/** Whether the game's Lab offers the kit `key` (every kit that is not a creative kit marked off it). */
export const inLab = (key) => !CREATIVE_DRUM_KITS.some((k) => k.key === key && k.lab === false);

export const creativeLabKits = () => Object.fromEntries(CREATIVE_DRUM_KITS.map(({ key, voices }) => [key,
  Object.fromEntries(Object.entries(voices).filter(([lane]) => lane !== 'rim').map(([lane, id]) => [lane === 'tom' ? 'fill' : lane, id])),
]));
