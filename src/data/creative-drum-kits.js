// Shared kit identities and lane assignments for the mixer, Lab and auditions.
// Sound definitions and measured levels live in voices.js.
export const CREATIVE_DRUM_KITS = [
  {
    "key": "glasshouse",
    "label": "Glasshouse",
    "description": "House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. Crisp and open, with restrained fills.",
    "bpm": 126,
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
  }
];

export const creativeLabKits = () => Object.fromEntries(CREATIVE_DRUM_KITS.map(({ key, voices }) => [key,
  Object.fromEntries(Object.entries(voices).filter(([lane]) => lane !== 'rim').map(([lane, id]) => [lane === 'tom' ? 'fill' : lane, id])),
]));
