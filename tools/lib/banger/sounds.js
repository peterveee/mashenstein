// BANGER SOUNDS — every sound a banger is made with, per style.
//
// WRITTEN BY THE BANGER SOUNDS PAGE (`npm run banger-sounds`, http://localhost:8022/).
// Edit it there: every choice is checked against tools/lib/banger/sound-rules.js before
// it is saved, and each slot can be auditioned in its real job. A hand edit is fine too —
// tests/banger-sounds.js holds this file to the same rules — but the page rewrites the
// whole file on Save, so a comment added in here will not survive.
//
//   parts   one preset for each part the generator writes (bass, square double, saws …)
//   kits    the drum kits the Kit switch picks between; wherever a kit leaves a drum
//           out, the style kit's plays
//   random  the shortlists Riff Sound = Random draws from, by the job a riff part does
//   moods   per mood: `parts` overrides the style's choice, `skip` takes sounds out of
//           the Random lists
//   never   presets no banger in this style may use — not as a part, not in a kit, not
//           at random
//
// The style's music (progressions, patterns, the mix) is in tools/lib/banger/styles/.

export const BANGER_SOUNDS = {
  "big-room": {
    parts: {
      bass: "seedBigRoomBass", sub: "seedBigRoomSub", square: "seedBigRoomSquare",
      squareDense: "initSquare", bell: "seedBigRoomBell", megaSaw: "seedBigRoomMegaSaw",
      third: "seedBigRoomThird", arp: "seedBigRoomArp", counter: "seedBigRoomCounter",
      choir: "seedBigRoomChoir", saws: "seedBigRoomSaws", pad: "seedBigRoomPad",
      piano: "mrdrElectricGrand", impact: "seedBigRoomImpact", shaker: "seedBigRoomShaker",
      tambourine: "seedBigRoomTambourine", congas: "seedBigRoomCongas", cowbell: "seedBigRoomCowbell",
      ride: "seedBigRoomRide", fallbackMelodic: "mrdrElectricGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedBigRoomKick", snare: "seedBigRoomSnare", clap: "seedBigRoomClap",
        hats: "seedBigRoomHats", ohats: "seedBigRoomOhats", crash: "seedBigRoomCrash",
        fill: "seedBigRoomFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrElectricGrand", "mrdrPopGrand", "tngrConcertGrand", "rmndDxPiano", "tngrIceBell",
        "tngrAlloyChime", "tngrMusicBell", "roundMono2", "tngrClassicSquare",
        "bestScreamerLead", "bestMegaSawLead", "syncRazorLead", "bestPwmHollowLead",
        "bestHeroLead", "tngrCrystalTrigger", "bestPwmBrass", "tngrBrassSection"
      ],
      counter: [
        "tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "mrdrElectricGrand",
        "bestPwmHollowLead", "tngrClassicSquare", "koto", "mrdrConcertFlute", "celeste2",
        "musicBox"
      ],
      bass: ["detuneBass", "tngrNightSequence", "bass80sFM", "bestClassicMono", "bass80sMono"],
      chords: [
        "tpSuperSaw", "mrdrPopGrand", "rmndTineEP", "bestPwmStrings", "bestPwmBrass",
        "tngrWarmStrings", "tngrGlassChoir", "tngrPolarDrift", "layerDreamPad",
        "bestPwmPadWide", "bestChoirAah"
      ],
    },
    choices: {
      saws: ["bestMegaSawLead", "mrdrFestivalStab", "bestPwmStrings"],
      pad: ["tngrGlassChoir", "layerDreamPad", "tngrCloudMemory"],
      arp: ["tngrWireHarp", "tngrDataMarimba", "bestPwmClav"],
      choir: ["bestChoirOoh", "jmjrChoirAah"],
      bell: ["tngrCelesta", "tngrAlloyChime", "mrdrVibraphone"],
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {
          arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      euphoric: {
        parts: {
          choir: "mrdrVocalOh",
        },
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  trance: {
    parts: {
      bass: "seedTranceBass", sub: "seedTranceSub", square: "seedTranceSquare",
      squareDense: "bestMegaSawLead", bell: "seedTranceBell", megaSaw: "seedTranceMegaSaw",
      third: "seedTranceThird", arp: "seedTranceArp", counter: "seedTranceCounter",
      choir: "seedTranceChoir", saws: "seedTranceSaws", pad: "seedTrancePad",
      piano: "seedTrancePiano", impact: "seedTranceImpact", shaker: "seedTranceShaker",
      tambourine: "seedTranceTambourine", congas: "seedTranceCongas", cowbell: "seedTranceCowbell",
      ride: "seedTranceRide", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedTranceKick", snare: "seedTranceSnare", clap: "seedTranceClap",
        hats: "seedTranceHats", ohats: "seedTranceOhats", crash: "seedTranceCrash",
        fill: "seedTranceFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrElectricGrand", "mrdrPopGrand", "tngrConcertGrand", "rmndDxPiano", "tngrIceBell",
        "tngrAlloyChime", "tngrMusicBell", "roundMono2", "tngrClassicSquare",
        "bestScreamerLead", "bestMegaSawLead", "syncRazorLead", "bestPwmHollowLead",
        "bestHeroLead", "tngrCrystalTrigger", "bestPwmBrass", "tngrBrassSection"
      ],
      counter: [
        "tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "mrdrElectricGrand",
        "bestPwmHollowLead", "tngrClassicSquare", "koto", "mrdrConcertFlute", "celeste2",
        "musicBox"
      ],
      bass: ["detuneBass", "tngrNightSequence", "bass80sFM", "bestClassicMono", "bass80sMono"],
      chords: [
        "tpSuperSaw", "mrdrPopGrand", "rmndTineEP", "bestPwmStrings", "bestPwmBrass",
        "tngrWarmStrings", "tngrGlassChoir", "tngrPolarDrift", "layerDreamPad",
        "bestPwmPadWide", "bestChoirAah"
      ],
    },
    choices: {
      saws: ["bestMegaSawLead", "bestPwmStrings", "mrdrFestivalStab"],
      pad: ["tngrPolarDrift", "tngrBlueCathedral", "layerDreamPad"],
      arp: ["tngrWireHarp", "tngrDataMarimba"],
      choir: ["bestChoirOoh", "jmjrChoirOoh"],
      bell: ["tngrCelesta", "tngrAlloyChime"],
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {},
        skip: [],
      },
      euphoric: {
        parts: {
          choir: "mrdrVocalOh",
        },
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  "future-bass": {
    parts: {
      bass: "seedFutureBassBass", sub: "seedFutureBassSub", square: "seedFutureBassSquare",
      squareDense: "initSquare", bell: "seedFutureBassBell", megaSaw: "seedFutureBassMegaSaw",
      third: "seedFutureBassThird", arp: "seedFutureBassArp", counter: "seedFutureBassCounter",
      choir: "seedFutureBassChoir", saws: "seedFutureBassSaws", pad: "seedFutureBassPad",
      piano: "seedFutureBassPiano", impact: "seedFutureBassImpact", shaker: "seedFutureBassShaker",
      tambourine: "seedFutureBassTambourine", congas: "seedFutureBassCongas", cowbell: "seedFutureBassCowbell",
      ride: "seedFutureBassRide", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedFutureBassKick", snare: "seedFutureBassSnare", clap: "seedFutureBassClap",
        hats: "seedFutureBassHats", ohats: "seedFutureBassOhats", crash: "seedFutureBassCrash",
        fill: "seedFutureBassFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrPopGrand", "musicBox", "celeste2", "tngrIceBell", "tngrAlloyChime",
        "tngrCrystalTrigger", "tngrMusicBell", "mrdrElectricGrand", "tngrConcertGrand",
        "roundMono2", "bestScreamerLead", "bestMegaSawLead"
      ],
      counter: [
        "tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "mrdrElectricGrand",
        "bestPwmHollowLead", "tngrClassicSquare", "koto", "mrdrConcertFlute", "celeste2",
        "musicBox"
      ],
      bass: ["detuneBass", "tngrNightSequence", "bass80sFM", "bestClassicMono", "bass80sMono"],
      chords: [
        "tpSuperSaw", "mrdrPopGrand", "rmndTineEP", "bestPwmStrings", "bestPwmBrass",
        "tngrWarmStrings", "tngrGlassChoir", "tngrPolarDrift", "layerDreamPad",
        "bestPwmPadWide", "bestChoirAah"
      ],
    },
    choices: {
      saws: ["bestPwmPadWide", "mrdrFestivalStab", "bestMegaSawLead"],
      pad: ["tngrDreamCircuit", "layerDreamPad", "tngrCloudMemory"],
      arp: ["tngrWireHarp", "tngrDataMarimba"],
      choir: ["mrdrVocalOh", "jmjrChoirOoh"],
      bell: ["tngrCelesta", "tngrMusicBell", "tpKalimba"],
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {
          arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      euphoric: {
        parts: {},
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  eurobeat: {
    parts: {
      bass: "bass80sDuo", sub: "stSubSine", square: "syncRazorLead",
      squareDense: "syncRazorLead", bell: "mrdrPopGrand", megaSaw: "bestMegaSawLead",
      third: "syncRazorLead", arp: "tngrCrystalTrigger", counter: "bestPwmBrass",
      choir: "bestChoirAah", saws: "bestPwmStrings", pad: "tngrWarmStrings",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "dsSnare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ohat909SixBit", crash: "ds909Crash",
        fill: "sdsTomHigh",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "syncRazorLead", "bestPwmBrass", "tngrBrassSection", "mrdrPopGrand",
        "mrdrElectricGrand", "rmndDxPiano", "roundMono2", "tngrClassicSquare",
        "bestScreamerLead", "bestHeroLead", "bestPwmHollowLead", "bestMegaSawLead",
        "tngrCrystalTrigger"
      ],
      counter: [
        "bestPwmBrass", "tngrBrassSection", "tngrCrystalTrigger", "mrdrElectricGrand",
        "tngrClassicSquare", "bestPwmHollowLead", "rmndDxPiano", "syncRazorLead"
      ],
      bass: [
        "bass80sDuo", "detuneBass", "bass80sFM", "bass80sMono", "bestClassicMono",
        "tngrNightSequence"
      ],
      chords: [
        "bestPwmStrings", "tngrWarmStrings", "bestPwmBrass", "tngrBrassSection",
        "mrdrPopGrand", "rmndTineEP", "tpSuperSaw", "bestChoirAah"
      ],
    },
    choices: {
      saws: ["synthStrings", "bestPwmPadWide"],
      pad: ["tngrSoftStrings", "synthStrings"],
      arp: ["tngrWireHarp", "bestPwmClav"],
      choir: ["bestChoirOoh"],
      bell: ["mrdrElectricGrand", "tngrBrightPiano"],
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {
          arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      euphoric: {
        parts: {
          choir: "mrdrVocalOh",
        },
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  chipstep: {
    parts: {
      bass: "seedChipstepBass", sub: "seedChipstepSub", square: "seedChipstepSquare",
      squareDense: "tngrPlainPulse", bell: "seedChipstepBell", megaSaw: "seedChipstepMegaSaw",
      third: "seedChipstepThird", arp: "seedChipstepArp", counter: "seedChipstepCounter",
      choir: "seedChipstepChoir", saws: "seedChipstepSaws", pad: "seedChipstepPad",
      piano: "initSquare", impact: "seedChipstepImpact", shaker: "seedChipstepShaker",
      tambourine: "seedChipstepTambourine", congas: "seedChipstepCongas", cowbell: "seedChipstepCowbell",
      ride: "seedChipstepRide", fallbackMelodic: "tngrPlainPulse",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedChipstepKick", snare: "seedChipstepSnare", clap: "seedChipstepClap",
        hats: "seedChipstepHats", ohats: "seedChipstepOhats", crash: "seedChipstepCrash",
        fill: "seedChipstepFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrPlainPulse", "tngrClassicSquare", "toneSquare", "initSquare", "roundMono2",
        "bestPwmHollowLead", "bestScreamerLead", "syncRazorLead", "bestMegaSawLead",
        "bestHeroLead", "tngrCrystalTrigger", "tngrIceBell", "tngrMusicBell",
        "mrdrElectricGrand"
      ],
      counter: [
        "toneSquare", "tngrClassicSquare", "tngrPlainPulse", "initSquare",
        "tngrCrystalTrigger", "tngrIceBell", "tngrAlloyChime", "bestPwmHollowLead",
        "tngrMusicBell"
      ],
      bass: [
        "tngrClassicSquare", "rmndSquarePop", "bestClassicMono", "bass80sMono", "detuneBass",
        "bass80sFM"
      ],
      chords: [
        "bestPwmPadWide", "bestPwmStrings", "bestPwmBrass", "bestPwmChoir", "initSquare",
        "tpSuperSaw", "syncOrbitPad", "rmndTineEP", "mrdrPopGrand"
      ],
    },
    choices: {
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {
          arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      euphoric: {
        parts: {
          choir: "mrdrVocalOh",
        },
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  "chipstep-lite": {
    parts: {
      bass: "tngrClassicSquare", sub: "wubYoi", square: "tngrPlainPulse",
      squareDense: "tngrPlainPulse", bell: "toneSquare", megaSaw: "tngrPlainSaw",
      third: "squareTone2", arp: "toneSquare", counter: "tngrClassicSquare",
      choir: "tngrGlassChoir", saws: "tngrPlainPulse", pad: "tngrSoftStrings",
      piano: "tngrHollowKeys", impact: "kwBlipDrop", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrPlainPulse",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kickClickTop", snare: "gameBoySnare", clap: "ds909SnareCrack",
        hats: "hatEngine", ohats: "ohat909SixBit", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrPlainPulse", "tngrClassicSquare", "toneSquare", "squareTone2", "tngrPlainSaw",
        "tngrCrystalTrigger", "tngrIceBell", "tngrMusicBell", "fmBell"
      ],
      counter: [
        "toneSquare", "tngrClassicSquare", "tngrPlainPulse", "squareTone2",
        "tngrCrystalTrigger", "tngrIceBell", "tngrAlloyChime", "tngrMusicBell"
      ],
      bass: [
        "tngrClassicSquare", "rmndSquarePop", "bass80sFM", "tngrRoundBass",
        "tngrNightSequence"
      ],
      chords: [
        "tngrPlainPulse", "tngrPlainSaw", "tngrSoftStrings", "tngrWarmStrings", "rmndTineEP",
        "tngrHollowKeys", "squareOrgan"
      ],
    },
    choices: {
      pad: ["tngrWarmStrings"],
      arp: ["tngrCrystalTrigger"],
      bell: ["tngrMusicBell"],
    },
    moods: {
    },
    never: [],
  },
  "chipstep-8bit": {
    parts: {
      bass: "toneTriangle", sub: "toneSine", square: "toneSquare",
      squareDense: "toneSquare", bell: "squareTone2", megaSaw: "toneSawtooth",
      third: "squareTone2", arp: "toneSquare", counter: "sawtoothTone2",
      choir: "toneTriangle", saws: "squareTone2", pad: "toneTriangle",
      piano: "squareOrgan", impact: "kwBlipDrop", shaker: "vl1Sha",
      tambourine: "hatEngine", congas: "tomEngine", cowbell: "kwBlipPing",
      ride: "ride909SixBit", fallbackMelodic: "toneSquare",
    },
    kits: {
      "808": {
        kick: "kickCrush", snare: "gameBoySnare", clap: "snareEngine",
        hats: "hatEngine", ohats: "ohatEngine", crash: "crashEngine",
        fill: "tomEngine",
      },
      "909": {
        kick: "kickClickTop", snare: "gameBoySnare", clap: "snareEngine",
        hats: "hatEngine", ohats: "ohatEngine", crash: "crashEngine",
        fill: "tomEngine",
      },
      style: {
        kick: "sdsKick", snare: "gameBoySnare", clap: "snareEngine",
        hats: "hatEngine", ohats: "ohatEngine", crash: "crashEngine",
        fill: "tomEngine",
      },
      studio: {
        kick: "kickEngine", snare: "gameBoySnare", clap: "snareEngine",
        hats: "hatEngine", ohats: "ohatEngine", crash: "crashEngine",
        fill: "tomEngine",
      },
      ds: {
        kick: "kickEngine", snare: "snareEngine", clap: "gameBoySnare",
        hats: "hatEngine", ohats: "ohatEngine", crash: "crashEngine",
        fill: "tomEngine",
      },
      cr78: {
        kick: "kickCrush", snare: "snareEngine", clap: "gameBoySnare",
        hats: "hatEngine", ohats: "ohatEngine", crash: "crashEngine",
        fill: "tomEngine",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["toneSquare", "squareTone2", "toneSawtooth", "sawtoothTone2", "toneTriangle"],
      counter: ["squareTone2", "toneSquare", "sawtoothTone2", "toneTriangle"],
      bass: ["toneTriangle", "toneSquare", "toneSawtooth", "sawtoothTone2"],
      chords: ["squareTone2", "squareOrgan", "toneSquare", "toneTriangle", "sawtoothTone2"],
    },
    choices: {
    },
    moods: {
    },
    never: [],
  },
  kraftwerk: {
    parts: {
      bass: "bestClassicMono", sub: "stSubSine", square: "toneTriangle",
      squareDense: "toneTriangle", bell: "tngrMusicBell", megaSaw: "bestPwmHollowLead",
      third: "bestRobotVox", arp: "tngrCrystalTrigger", counter: "toneSquare",
      choir: "bestPwmChoir", saws: "bestPwmStrings", pad: "bestPwmStrings",
      piano: "bestPwmBrass", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrClassicSquare", sonar: "toneSine",
      vocoder: "bestRobotVox", rim: "rimClang",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "sdsKick", snare: "sdsSnare", clap: "sdCrack",
        hats: "stMetalHatClosed", ohats: "hatFoilOpen", crash: "ds909Crash",
        fill: "sdsTomHigh",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrClassicSquare", "toneSquare", "tngrPlainPulse", "initSquare", "tngrMusicBell",
        "tngrAlloyChime", "tngrIceBell", "bestPwmHollowLead", "bestPwmReedLead", "rmndDxPiano",
        "tngrCrystalTrigger"
      ],
      counter: [
        "tngrAlloyChime", "tngrMusicBell", "toneSquare", "tngrClassicSquare",
        "tngrCrystalTrigger", "tngrIceBell", "bestPwmHollowLead"
      ],
      bass: [
        "bestClassicMono", "bass80sMono", "tngrNightSequence", "bass80sFM", "detuneBass",
        "rmndSquarePop"
      ],
      chords: [
        "bestPwmChoir", "bestPwmStrings", "bestPwmBrass", "bestPwmPadWide", "tngrGlassChoir",
        "initSquare", "rmndTineEP"
      ],
    },
    choices: {
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {},
        skip: [],
      },
      euphoric: {
        parts: {
          choir: "mrdrVocalOh",
        },
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  synthwave: {
    parts: {
      bass: "bestClassicMono", sub: "stSubSine", square: "bestHeroLead",
      squareDense: "bestHeroLead", bell: "tngrIceBell", megaSaw: "bestPwmHollowLead",
      third: "mrdrElectricGrand", arp: "tngrCrystalTrigger", counter: "bestPwmBrass",
      choir: "tngrGlassChoir", saws: "bestPwmStrings", pad: "tngrWarmStrings",
      piano: "mrdrElectricGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "bestHeroLead",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", crash: "kit_80s_pop_crash",
        fill: "sdsTomHigh",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "bestHeroLead", "bestPwmHollowLead", "syncRazorLead", "tngrIceBell",
        "mrdrElectricGrand", "rmndDxPiano", "tngrCrystalTrigger", "bestPwmBrass",
        "tngrBrassSection", "roundMono2", "tngrClassicSquare", "mrdrPopGrand"
      ],
      counter: [
        "tngrIceBell", "tngrCrystalTrigger", "mrdrElectricGrand", "bestPwmHollowLead",
        "rmndDxPiano", "bestPwmBrass", "tngrAlloyChime"
      ],
      bass: [
        "bestClassicMono", "detuneBass", "bass80sFM", "bass80sMono", "tngrNightSequence",
        "syncBassBite"
      ],
      chords: [
        "bestPwmStrings", "tngrWarmStrings", "bestPwmBrass", "tngrGlassChoir", "rmndTineEP",
        "mrdrElectricGrand", "bestPwmPadWide", "tngrPolarDrift"
      ],
    },
    choices: {
      saws: ["bestPwmPadWide", "synthStrings"],
      pad: ["tngrBurntHorizon", "tngrDreamCircuit", "layerDreamPad"],
      arp: ["tngrWireHarp", "bestSampleHoldPulse", "bestPwmClav"],
      choir: ["bestPwmChoir", "jmjrChoirOoh"],
      bell: ["tngrCelesta", "mrdrDx7Keys", "mrdrVibraphone"],
    },
    moods: {
      anthemic: {
        parts: {},
        skip: [],
      },
      uplifting: {
        parts: {
          arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      euphoric: {
        parts: {
          choir: "mrdrVocalOh",
        },
        skip: [],
      },
      moody: {
        parts: {
          counter: "mrdrMutedTrumpet", bell: "mrdrVibraphone",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      dark: {
        parts: {
          bass: "mrdrDist808", impact: "metalHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      gothic: {
        parts: {
          pad: "fullOrgan", choir: "bestChoirAah", bell: "mrdrTollingBell",
          arp: "mrdrHarpsichord", sub: "mrdrPedalOrgan", impact: "timpaniHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      heroic: {
        parts: {
          pad: "tngrBrassSection", choir: "bestChoirAah", bass: "mrdrTuba",
          counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      nostalgic: {
        parts: {
          piano: "epiano", pad: "tngrWarmStrings", bell: "mrdrVibraphone",
          third: "mrdrDx7Keys", counter: "mrdrSaxophone",
        },
        skip: [],
      },
      funky: {
        parts: {
          bass: "mrdrSlapPop", piano: "clav", arp: "mrdrWahGuitar",
          third: "mrdrHornStab", counter: "bestVoiceBox70s",
        },
        skip: [],
      },
      bittersweet: {
        parts: {
          pad: "tngrSoftStrings", piano: "wndrFeltPiano", bell: "celeste2",
          counter: "mrdrCello",
        },
        skip: [],
      },
      disco: {
        parts: {
          bass: "tngrPickedBass", pad: "mrdrViolinSection", arp: "mrdrFunkGuitarMuted",
          counter: "tngrBrassSection", impact: "sdDiscoTom",
        },
        skip: [],
      },
      sunshine: {
        parts: {
          piano: "tngrBrightPiano", bell: "toyPiano", arp: "mrdrAcousticGuitar",
        },
        skip: [],
      },
      doowop: {
        parts: {
          bass: "mrdrContrabass", pad: "bestChoirOoh", choir: "bestChoirOoh",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      lament: {
        parts: {
          pad: "mrdrViolinSection", piano: "wndrConcertGrand", choir: "bestChoirOoh",
          counter: "mrdrOboe",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      lofi: {
        parts: {
          piano: "tngrFeltUpright", pad: "warmPad", bell: "wndrFeltPiano",
          arp: "tpKalimba",
        },
        skip: [],
      },
      dreamy: {
        parts: {
          pad: "tngrCloudMemory", bell: "celeste", arp: "tngrWireHarp",
          counter: "tngrAirFlute",
        },
        skip: [],
      },
      wonder: {
        parts: {
          pad: "tngrBlueCathedral", choir: "bestChoirAah", bell: "tngrCelesta",
          arp: "musicBox", counter: "mrdrFrenchHorn", impact: "timpaniHit",
        },
        skip: [],
      },
      lounge: {
        parts: {
          bass: "mrdrContrabass", piano: "rmndTineEP", bell: "mrdrVibraphone",
          arp: "mrdrAcousticGuitar", counter: "mrdrConcertFlute",
        },
        skip: [],
      },
      boogie: {
        parts: {
          bass: "mrdrContrabass", piano: "wndrOldUpright", third: "mrdrHornStab",
          counter: "mrdrSaxophone",
        },
        skip: [],
      },
      boss: {
        parts: {
          pad: "bestPwmBrass", arp: "mrdrViolinMarcato", choir: "bestChoirAah",
          bell: "tngrAlloyChime", impact: "taikoHit",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      flamenco: {
        parts: {
          piano: "mrdrAcousticGuitar", arp: "mrdrAcousticGuitar", pad: "mrdrViolinSection",
          counter: "mrdrViolin", cowbell: "clvRosewood",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      hypnotic: {
        parts: {
          bass: "tngrNightSequence", pad: "tngrDreamCircuit", arp: "tngrRubyScanner",
          bell: "fmBell",
        },
        skip: [],
      },
      fiesta: {
        parts: {
          piano: "mrdrPopGrand", arp: "marimba", counter: "mrdrHornStab",
          shaker: "guiraChk", cowbell: "cbAgogoWide",
        },
        skip: [],
      },
      soulful: {
        parts: {
          piano: "mrdrGrand", pad: "addDrawbar", choir: "bestChoirAah",
          counter: "tngrElectricKeys",
        },
        skip: [],
      },
      mystery: {
        parts: {
          bass: "mrdrContrabass", pad: "tngrSoftStrings", bell: "mrdrVibraphone",
          arp: "mrdrFunkGuitar", counter: "mrdrClarinet",
        },
        skip: ["tngrMusicBell", "celeste2", "musicBox", "koto"],
      },
      playful: {
        parts: {
          bass: "mrdrTuba", piano: "wndrOldUpright", bell: "toyPiano",
          arp: "marimba", counter: "tpPizz", cowbell: "kwBlipWood",
        },
        skip: [],
      },
    },
    never: [],
  },
  "synthwave-lite": {
    parts: {
      bass: "tngrNightSequence", sub: "stSubSine", square: "tngrHorizonSolo",
      squareDense: "tngrHorizonSolo", bell: "tngrIceBell", megaSaw: "tngrNeonReed",
      third: "tngrDigitalEp84", arp: "tngrCrystalTrigger", counter: "tngrBrassSection",
      choir: "tngrGlassChoir", saws: "tngrWarmStrings", pad: "tngrBurntHorizon",
      piano: "tngrDigitalEp84", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrHorizonSolo",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ohat909SixBit", crash: "ds909Crash",
        fill: "sdsTomHigh",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrHorizonSolo", "tngrNeonReed", "tngrBerlinSignal", "tngrIceBell",
        "tngrDigitalEp84", "rmndDxPiano", "tngrCrystalTrigger", "tngrBrassSection",
        "tngrClassicSquare", "tngrRubyScanner"
      ],
      counter: [
        "tngrIceBell", "tngrCrystalTrigger", "tngrDigitalEp84", "rmndDxPiano",
        "tngrBrassSection", "tngrAlloyChime", "tngrNeonReed"
      ],
      bass: [
        "tngrNightSequence", "bass80sFM", "tngrOrangeCurrent", "tngrGlassMotor",
        "tngrHollowVector", "rmndDxPop"
      ],
      chords: [
        "tngrWarmStrings", "tngrSoftStrings", "tngrBrassSection", "tngrGlassChoir",
        "rmndTineEP", "tngrBurntHorizon", "tngrPolarDrift", "tngrDigitalEp84"
      ],
    },
    choices: {
      saws: ["tngrSoftStrings"],
      pad: ["tngrDreamCircuit", "tngrPolarDrift"],
      arp: ["tngrWireHarp", "tngrDataMarimba"],
      bell: ["tngrCelesta", "tngrMusicBell"],
    },
    moods: {
    },
    never: [],
  },
  shibuya: {
    parts: {
      bass: "tngrRoundBass", sub: "stSubSine", square: "mrdrVibraphone",
      squareDense: "mrdrVibraphone", bell: "tngrCelesta", megaSaw: "mrdrMutedTrumpet",
      third: "epiano", arp: "mrdrHarpsichord", counter: "mrdrConcertFlute",
      choir: "bestChoirAah", saws: "tngrWarmStrings", pad: "addDrawbar",
      piano: "mrdrAcousticGuitar", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "epiano",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_rim",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", crash: "kit_brushes_crash",
        fill: "kit_brushes_tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrConcertFlute", "mrdrVibraphone", "mrdrMutedTrumpet", "epiano", "mrdrHarpsichord",
        "tngrCelesta", "mrdrAcousticGuitar"
      ],
      counter: [
        "mrdrConcertFlute", "mrdrVibraphone", "mrdrMutedTrumpet", "tngrCelesta",
        "mrdrHarpsichord"
      ],
      bass: ["tngrRoundBass", "tngrPickedBass", "layerLoungeBass", "layerWalkingBass"],
      chords: [
        "epiano", "mrdrAcousticGuitar", "addDrawbar", "tngrWarmStrings", "mrdrHarpsichord",
        "mrdrVibraphone"
      ],
    },
    choices: {
      saws: ["bestPwmStrings"],
      pad: ["tngrWarmStrings"],
      arp: ["mrdrVibraphone", "mrdrAcousticGuitar"],
      choir: ["jmjrChoirOoh"],
      bell: ["mrdrVibraphone"],
    },
    moods: {
    },
    never: [],
  },
  dnb: {
    parts: {
      bass: "bestReeseBass", sub: "stSubSine", square: "tngrWireHarp",
      squareDense: "tngrWireHarp", bell: "tngrIceBell", megaSaw: "bestPwmHollowLead",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "tngrAlloyChime",
      choir: "tngrGlassChoir", saws: "bestPwmPadWide", pad: "tngrPolarDrift",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "snareTight", clap: "dsCrackSnare2",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrWireHarp", "tngrIceBell", "rmndTineEP", "tngrCrystalTrigger", "bestPwmHollowLead",
        "tngrAlloyChime", "mrdrElectricGrand", "epiano"
      ],
      counter: ["tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "rmndTineEP", "tngrWireHarp"],
      bass: ["bestReeseBass", "syncBassBite", "bestClassicMono", "detuneBass"],
      chords: [
        "tngrPolarDrift", "glassPad", "tngrGlassChoir", "rmndTineEP", "bestPwmPadWide",
        "tngrDreamCircuit"
      ],
    },
    choices: {
      saws: ["tngrDreamCircuit"],
      pad: ["glassPad", "tngrBurntHorizon", "layerDreamPad"],
      arp: ["tngrWireHarp", "bestSampleHoldPulse"],
      choir: ["bestChoirOoh"],
      bell: ["tngrAlloyChime"],
    },
    moods: {
    },
    never: [],
  },
  electro: {
    parts: {
      bass: "mrdrDist808", sub: "stSubSine", square: "bestRobotVox",
      squareDense: "bestRobotVox", bell: "fmBell", megaSaw: "hardFm",
      third: "fmKeys", arp: "bestSampleHoldPulse", counter: "toneSquare",
      choir: "bestPwmChoir", saws: "bestPwmStrings", pad: "bestPwmStrings",
      piano: "brassStab", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "fmKeys",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "dsHatClosed", ohats: "ds808OpenHat", crash: "crash808Long",
        fill: "ds808Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "bestRobotVox", "hardFm", "toneSquare", "tngrPlainPulse", "fmKeys",
        "bestPwmHollowLead", "syncRazorLead", "fmBell"
      ],
      counter: ["toneSquare", "fmBell", "bestSampleHoldPulse", "fmKeys", "tngrPlainPulse"],
      bass: ["mrdrDist808", "bass80sFM", "syncBassBite", "bestClassicMono"],
      chords: ["brassStab", "bestPwmBrass", "bestPwmStrings", "fmKeys", "mrdrHornStab"],
    },
    choices: {
      saws: ["bestPwmPadWide"],
      pad: ["synthStrings"],
      arp: ["toneSquare", "tngrCrystalTrigger"],
      choir: ["tngrGlassChoir"],
      bell: ["tngrIceBell"],
    },
    moods: {
    },
    never: [],
  },
  megadrive: {
    parts: {
      bass: "seedMegadriveBass", sub: "seedMegadriveSub", square: "seedMegadriveSquare",
      squareDense: "layerMegamixLead", bell: "seedMegadriveBell", megaSaw: "seedMegadriveMegaSaw",
      third: "seedMegadriveThird", arp: "seedMegadriveArp", counter: "seedMegadriveCounter",
      choir: "seedMegadriveChoir", saws: "bestPwmBrass", pad: "seedMegadrivePad",
      piano: "seedMegadrivePiano", impact: "syn3PewDeep", shaker: "seedMegadriveShaker",
      tambourine: "seedMegadriveTambourine", congas: "seedMegadriveCongas", cowbell: "seedMegadriveCowbell",
      ride: "seedMegadriveRide", fallbackMelodic: "layerMegamixLead",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedMegadriveKick", snare: "seedMegadriveSnare", clap: "seedMegadriveClap",
        hats: "hatEngine", ohats: "seedMegadriveOhats", crash: "seedMegadriveCrash",
        fill: "seedMegadriveFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "layerMegamixLead", "hardFm", "fmKeys", "fmBell", "rmndDxPiano", "mrdrDx7Keys",
        "toneSquare", "bestPwmBrass"
      ],
      counter: ["fmBell", "fmKeys", "mrdrDx7Keys", "rmndDxPiano", "toneSquare"],
      bass: ["rmndDxSlap", "bass80sFM", "layerMegamixBass", "rmndDxPop", "rmndMaxPop"],
      chords: ["fmKeys", "rmndDxPiano", "bestPwmBrass", "mrdrDx7Keys", "synthStrings"],
    },
    choices: {
      saws: ["synthStrings"],
      pad: ["bestPwmStrings"],
      arp: ["mrdrDx7Keys", "toneSquare"],
      choir: ["jmjrChoirOoh"],
      bell: ["mrdrDx7Keys"],
    },
    moods: {
    },
    never: [],
  },
  "deep-house": {
    parts: {
      bass: "tngrRoundBass", sub: "stSubSine", square: "mrdrVibraphone",
      squareDense: "mrdrVibraphone", bell: "tngrIceBell", megaSaw: "tngrHorizonSolo",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "jmjrChoirOoh",
      choir: "jmjrChoirOoh", saws: "tngrCloudMemory", pad: "tngrCloudMemory",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "dsShaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "rmndTineEP", "tngrMemoryOrgan", "mrdrVibraphone", "tngrDigitalEp84",
        "mrdrElectricGrand", "tngrHorizonSolo", "tngrCrystalTrigger", "mrdrDeepOrganStab"
      ],
      counter: ["mrdrVibraphone", "tngrIceBell", "rmndTineEP", "tngrCrystalTrigger", "tngrAlloyChime"],
      bass: ["tngrRoundBass", "roundBass", "tpBassy", "bass80sMono"],
      chords: [
        "rmndTineEP", "tngrMemoryOrgan", "tngrCloudMemory", "epiano", "tngrDigitalEp84",
        "warmPad", "mrdrHouseOrganStab", "mrdrDeepOrganStab", "addOrganStab"
      ],
    },
    choices: {
      saws: ["warmPad"],
      pad: ["warmPad", "tngrPolarDrift"],
      arp: ["tngrWireHarp"],
      choir: ["mrdrVocalOh"],
      bell: ["mrdrVibraphone"],
    },
    moods: {
    },
    never: [],
  },
  "nu-disco": {
    parts: {
      bass: "tngrPickedBass", sub: "stSubSine", square: "mrdrVibraphone",
      squareDense: "mrdrVibraphone", bell: "tngrCelesta", megaSaw: "mrdrConcertFlute",
      third: "rmndTineEP", arp: "mrdrAcousticGuitar", counter: "mrdrVibraphone",
      choir: "jmjrChoirOoh", saws: "tngrSoftStrings", pad: "tngrSoftStrings",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaHigh", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Snare",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrConcertFlute", "tngrHorizonSolo", "rmndTineEP", "mrdrVibraphone", "marimba",
        "mrdrSaxophone", "tngrAirFlute"
      ],
      counter: [
        "mrdrVibraphone", "mrdrConcertFlute", "tngrCelesta", "marimba", "rmndTineEP",
        "mrdrFunkGuitar"
      ],
      bass: ["tngrPickedBass", "tngrRoundBass", "rmndDxSlap", "tpBassGuitar"],
      chords: [
        "tngrSoftStrings", "rmndTineEP", "mrdrAcousticGuitar", "tngrWarmStrings", "epiano",
        "addDrawbar", "mrdrFunkGuitar"
      ],
    },
    choices: {
      saws: ["tngrWarmStrings"],
      pad: ["tngrWarmStrings"],
      choir: ["jmjrChoirAah"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  downtempo: {
    parts: {
      bass: "tngrRoundBass", sub: "stSubSine", square: "mrdrVibraphone",
      squareDense: "mrdrVibraphone", bell: "mrdrVibraphone", megaSaw: "mrdrMutedTrumpet",
      third: "rmndTineEP", arp: "mrdrVibraphone", counter: "mrdrVibraphone",
      choir: "jmjrChoirOoh", saws: "tngrSoftStrings", pad: "tngrSoftStrings",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaLow", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "snareFat", clap: "snareFat",
        hats: "dsHatClosed", ohats: "dsHatOpen", crash: "ds909Crash",
        fill: "dsTom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrMutedTrumpet", "mrdrVibraphone", "rmndTineEP", "mrdrClarinet", "wndrFeltPiano",
        "mrdrCello", "mrdrShakuhachi"
      ],
      counter: ["mrdrVibraphone", "mrdrMutedTrumpet", "rmndTineEP", "tngrCelesta", "mrdrClarinet"],
      bass: ["tngrRoundBass", "roundBass", "mrdrContrabass", "tpBassGuitar"],
      chords: ["rmndTineEP", "tngrSoftStrings", "wndrFeltPiano", "tngrFeltUpright", "warmPad"],
    },
    choices: {
      saws: ["tngrWarmStrings"],
      pad: ["tngrWarmStrings"],
      arp: ["wndrFeltPiano"],
      choir: ["jmjrChoirAah"],
      bell: ["tngrCelesta"],
    },
    moods: {
    },
    never: [],
  },
  "electro-funk": {
    parts: {
      bass: "mrdrSynthSlap", sub: "stSubSine", square: "syncWireClav",
      squareDense: "syncWireClav", bell: "tngrCelesta", megaSaw: "tngrBrassSection",
      third: "rmndDxPiano", arp: "mrdrFunkGuitarMuted", counter: "mrdrHornStab",
      choir: "jmjrChoirAah", saws: "tngrBrassSection", pad: "tngrWarmStrings",
      piano: "syncWireClav", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "tr808CowbellClassic",
      ride: "ride909SixBit", fallbackMelodic: "rmndDxPiano",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "dsHatClosed", ohats: "ds808OpenHat", crash: "cy808Cymbal",
        fill: "ds808Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "bestVoiceBox70s", "syncVowelLead", "tngrNeonReed", "mrdrSaxophone", "clav",
        "rmndDxPiano", "bestPwmBrass"
      ],
      counter: ["mrdrHornStab", "clav", "mrdrFunkGuitarMuted", "tngrBrassSection", "rmndDxPiano"],
      bass: ["mrdrSynthSlap", "rmndDxSlap", "tngrSlap", "mrdrSlapPop", "rubberBass"],
      chords: [
        "syncWireClav", "clav", "mrdrFunkGuitarMuted", "tngrDigitalEp84", "tngrBrassSection",
        "mrdrFunkGuitar"
      ],
    },
    choices: {
      saws: ["bestPwmBrass"],
      pad: ["tngrSoftStrings"],
      arp: ["mrdrWahGuitar"],
      choir: ["jmjrChoirOoh"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  eurodance: {
    parts: {
      bass: "detuneBass", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tngrIceBell", megaSaw: "bestMegaSawLead",
      third: "mrdrPopGrand", arp: "tngrCrystalTrigger", counter: "tngrCrystalTrigger",
      choir: "bestChoirAah", saws: "tpSuperSaw", pad: "synthStrings",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tpSuperSaw", "bestMegaSawLead", "mrdrPopGrand", "syncRazorLead", "tngrBrassSection",
        "fmBell", "mrdrFestivalStab"
      ],
      counter: ["tngrCrystalTrigger", "fmBell", "mrdrPopGrand", "tngrIceBell", "synthPluck"],
      bass: ["detuneBass", "bass80sSynth", "tngrOrangeCurrent", "roundMono"],
      chords: ["mrdrPopGrand", "tngrBrightPiano", "synthStrings", "tpSuperSaw", "tngrHollowKeys"],
    },
    choices: {
      saws: ["bestMegaSawLead"],
      pad: ["tngrPolarDrift"],
      arp: ["tngrWireHarp"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  "french-house": {
    parts: {
      bass: "tngrPickedBass", sub: "stSubSine", square: "mrdrElectricGrand",
      squareDense: "mrdrElectricGrand", bell: "tngrCelesta", megaSaw: "tngrBrassSection",
      third: "tngrElectricKeys", arp: "mrdrWahGuitar", counter: "mrdrFunkGuitarMuted",
      choir: "jmjrChoirOoh", saws: "tngrWarmStrings", pad: "tngrWarmStrings",
      piano: "tngrElectricKeys", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrElectricKeys",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrElectricKeys", "tngrBrassSection", "bestVoiceBox70s", "mrdrElectricGrand",
        "tngrDigitalEp84", "mrdrFunkGuitar"
      ],
      counter: ["mrdrFunkGuitarMuted", "tngrElectricKeys", "tngrBrassSection", "rmndTineEP"],
      bass: ["tngrPickedBass", "rubberBass", "tpBassGuitar", "rmndDxSlap"],
      chords: [
        "tngrElectricKeys", "rmndTineEP", "mrdrFunkGuitar", "mrdrHouseOrganStab",
        "tngrBrassSection", "epiano"
      ],
    },
    choices: {
      saws: ["tngrSoftStrings"],
      pad: ["tngrSoftStrings"],
      arp: ["mrdrFunkGuitarMuted"],
      choir: ["jmjrChoirAah"],
      bell: ["mrdrVibraphone"],
    },
    moods: {
    },
    never: [],
  },
  "italo-disco": {
    parts: {
      bass: "seedItaloDiscoBass", sub: "seedItaloDiscoSub", square: "seedItaloDiscoSquare",
      squareDense: "tngrBerlinSignal", bell: "seedItaloDiscoBell", megaSaw: "seedItaloDiscoMegaSaw",
      third: "seedItaloDiscoThird", arp: "seedItaloDiscoArp", counter: "seedItaloDiscoCounter",
      choir: "seedItaloDiscoChoir", saws: "stSynthStrings", pad: "seedItaloDiscoPad",
      piano: "tngrDigitalEp84", impact: "syn3PewDeep", shaker: "seedItaloDiscoShaker",
      tambourine: "seedItaloDiscoTambourine", congas: "seedItaloDiscoCongas", cowbell: "seedItaloDiscoCowbell",
      ride: "seedItaloDiscoRide", fallbackMelodic: "tngrDigitalEp84",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", crash: "kit_syndrum_disco_crash",
        fill: "kit_syndrum_disco_tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "bestRobotVox", "tngrHorizonSolo", "tngrBerlinSignal", "syncVowelLead",
        "bestPwmHollowLead", "tngrDigitalEp84"
      ],
      counter: ["tngrCrystalTrigger", "tngrIceBell", "tngrDigitalEp84", "fmBell"],
      bass: ["bass80sFM", "tngrNightSequence", "tngrOrangeCurrent", "rmndDxSlap"],
      chords: [
        "tngrPolarDrift", "stSynthStrings", "tngrDigitalEp84", "bestPwmStrings",
        "synthStrings"
      ],
    },
    choices: {
      saws: ["bestPwmStrings"],
      pad: ["stSynthStrings"],
      arp: ["tngrNightSequence"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  reggaeton: {
    parts: {
      bass: "seedReggaetonBass", sub: "seedReggaetonSub", square: "seedReggaetonSquare",
      squareDense: "marimba", bell: "seedReggaetonBell", megaSaw: "seedReggaetonMegaSaw",
      third: "seedReggaetonThird", arp: "seedReggaetonArp", counter: "seedReggaetonCounter",
      choir: "seedReggaetonChoir", saws: "tngrDreamCircuit", pad: "seedReggaetonPad",
      piano: "seedReggaetonPiano", impact: "seedReggaetonImpact", shaker: "seedReggaetonShaker",
      tambourine: "seedReggaetonTambourine", congas: "seedReggaetonCongas", cowbell: "seedReggaetonCowbell",
      ride: "seedReggaetonRide", fallbackMelodic: "tngrDataMarimba",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedReggaetonKick", snare: "seedReggaetonSnare", clap: "seedReggaetonClap",
        hats: "seedReggaetonHats", ohats: "seedReggaetonOhats", crash: "seedReggaetonCrash",
        fill: "seedReggaetonFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["tngrDataMarimba", "marimba", "tpKalimba", "synthPluck", "tngrWireHarp", "koto"],
      counter: ["tngrDataMarimba", "tpKalimba", "koto", "marimba", "tngrWireHarp"],
      bass: ["mrdrDist808", "stSubSine", "roundBass", "tngrRoundBass"],
      chords: [
        "mrdrAcousticGuitar", "tngrSoftPiano", "tngrDreamCircuit", "warmPad",
        "tngrCloudMemory", "synthPluck"
      ],
    },
    choices: {
      saws: ["warmPad"],
      pad: ["warmPad", "tngrCloudMemory"],
      arp: ["tngrWireHarp"],
      choir: ["jmjrChoirAah"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  moombahton: {
    parts: {
      bass: "bestReeseBass", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tpKalimba", megaSaw: "bestMegaSawLead",
      third: "tngrDataMarimba", arp: "tngrDataMarimba", counter: "tpKalimba",
      choir: "bestChoirAah", saws: "mrdrFestivalStab", pad: "tngrPolarDrift",
      piano: "mrdrElectricGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "bigRoomClap", congas: "ds808Tom", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrDataMarimba",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "dsSnare", clap: "snareTight",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "crash808Long",
        fill: "ds808Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrDataMarimba", "tpKalimba", "marimba", "tngrCrystalTrigger", "tngrWireHarp",
        "mrdrFestivalStab", "bestMegaSawLead"
      ],
      counter: ["tpKalimba", "tngrDataMarimba", "marimba", "tngrWireHarp", "tngrIceBell"],
      bass: ["bestReeseBass", "detuneBass", "mrdrDist808", "tngrRoundBass"],
      chords: ["mrdrFestivalStab", "tpSuperSaw", "bestPwmBrass", "mrdrPopGrand", "tngrPolarDrift"],
    },
    choices: {
      saws: ["tpSuperSaw", "bestMegaSawLead"],
      pad: ["tngrGlassChoir", "tngrCloudMemory"],
      arp: ["tngrWireHarp", "tngrCrystalTrigger"],
      choir: ["jmjrChoirAah"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  merenhouse: {
    parts: {
      bass: "rmndDxSlap", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tngrIceBell", megaSaw: "mrdrMutedTrumpet",
      third: "mrdrSaxophone", arp: "mrdrAcousticGuitar", counter: "tngrBrassSection",
      choir: "bestChoirAah", saws: "tngrBrassSection", pad: "tngrWarmStrings",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "guiraScrape",
      tambourine: "tambourine", congas: "tambora", cowbell: "kit_rio_lanterns_rim",
      ride: "ride909SixBit", fallbackMelodic: "mrdrSaxophone",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "ds909Snare", clap: "ds909Clap",
        hats: "guiraChk", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "kit_rio_lanterns_tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrSaxophone", "tngrBrassSection", "mrdrMutedTrumpet", "mrdrPopGrand",
        "mrdrAcousticGuitar", "tngrDataMarimba"
      ],
      counter: ["tngrBrassSection", "mrdrMutedTrumpet", "mrdrSaxophone", "mrdrPopGrand", "tpKalimba"],
      bass: ["rmndDxSlap", "mrdrSlapThumb", "tngrSlap", "tngrRoundBass"],
      chords: [
        "mrdrPopGrand", "rmndDxPiano", "tngrConcertGrand", "mrdrElectricGrand",
        "tngrBrassSection"
      ],
    },
    choices: {
      saws: ["bestPwmBrass"],
      pad: ["tngrPolarDrift", "tngrCloudMemory"],
      arp: ["tngrWireHarp", "tngrDataMarimba"],
      choir: ["jmjrChoirAah"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "afro-house": {
    parts: {
      bass: "tngrRoundBass", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tpKalimba", megaSaw: "mrdrPanFlute",
      third: "tngrDataMarimba", arp: "tngrWireHarp", counter: "jmjrChoirAah",
      choir: "jmjrChoirAah", saws: "tngrCloudMemory", pad: "tngrCloudMemory",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "shekere",
      tambourine: "djembeSlap", congas: "djembeTone", cowbell: "cbAgogoWide",
      ride: "ride909SixBit", fallbackMelodic: "tpKalimba",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
      style: {
        kick: "ds909KickPunch", snare: "dsSnare", clap: "clap808",
        hats: "shekere", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "talkingDrum",
      },
    },
    random: {
      hook: [
        "tpKalimba", "mrdrPanFlute", "tngrDataMarimba", "marimba", "tngrWireHarp",
        "bestPwmClav", "mrdrConcertFlute"
      ],
      counter: ["tpKalimba", "mrdrPanFlute", "tngrWireHarp", "marimba"],
      bass: ["tngrRoundBass", "tngrNightSequence", "bestClassicMono", "stSubSine"],
      chords: ["tngrCloudMemory", "tngrGlassChoir", "tngrPolarDrift", "rmndTineEP", "warmPad"],
    },
    choices: {
      saws: ["tngrGlassChoir"],
      pad: ["tngrGlassChoir", "warmPad"],
      arp: ["tngrDataMarimba", "marimba"],
      choir: ["bestChoirOoh"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "afro-house-melodic": {
    parts: {
      bass: "tngrNightSequence", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tpKalimba", megaSaw: "mrdrPanFlute",
      third: "tngrDataMarimba", arp: "tngrWireHarp", counter: "tpKalimba",
      choir: "jmjrChoirAah", saws: "tngrGlassChoir", pad: "tngrGlassChoir",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "dsShaker",
      tambourine: "clvRosewood", congas: "congaMid", cowbell: "cbAgogoWide",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPanFlute",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
      style: {
        kick: "ds909Kick", snare: "dsSnare", clap: "ds909Clap",
        hats: "dsShaker", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "talkingDrum",
      },
    },
    random: {
      hook: ["mrdrPanFlute", "mrdrConcertFlute", "tngrWireHarp", "tpKalimba", "tngrAirFlute"],
      counter: ["tpKalimba", "mrdrPanFlute", "tngrWireHarp", "marimba"],
      bass: ["tngrNightSequence", "tngrRoundBass", "bass80sFM", "stSubSine"],
      chords: ["tngrGlassChoir", "tngrCloudMemory", "tngrPolarDrift", "warmPad"],
    },
    choices: {
      saws: ["tngrCloudMemory"],
      pad: ["tngrCloudMemory", "warmPad"],
      arp: ["tngrDataMarimba", "marimba"],
      choir: ["bestChoirOoh"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "afro-house-tech": {
    parts: {
      bass: "bestClassicMono", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tpKalimba", megaSaw: "tngrDataMarimba",
      third: "tngrDataMarimba", arp: "marimba", counter: "jmjrChoirAah",
      choir: "jmjrChoirAah", saws: "tngrPolarDrift", pad: "tngrPolarDrift",
      piano: "bestPwmClav", impact: "syn3PewDeep", shaker: "shekere",
      tambourine: "cbAgogoWide", congas: "ds808Tom", cowbell: "cbAgogoWide",
      ride: "ride909SixBit", fallbackMelodic: "tngrDataMarimba",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
      style: {
        kick: "ds909KickPunch", snare: "dsSnare", clap: "clap808",
        hats: "shekere", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "talkingDrum",
      },
    },
    random: {
      hook: ["tngrDataMarimba", "tngrWireHarp", "bestPwmClav", "marimba"],
      counter: ["tngrDataMarimba", "bestPwmClav", "tngrWireHarp", "marimba"],
      bass: ["bestClassicMono", "tngrNightSequence", "bass80sFM", "tngrRoundBass"],
      chords: ["bestPwmClav", "tngrPolarDrift", "rmndTineEP", "tngrCloudMemory"],
    },
    choices: {
      saws: ["tngrGlassChoir"],
      pad: ["tngrCloudMemory"],
      arp: ["tngrDataMarimba"],
      choir: ["bestChoirOoh"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "reggaeton-romantico": {
    parts: {
      bass: "tngrRoundBass", sub: "seedReggaetonSub", square: "seedReggaetonSquare",
      squareDense: "marimba", bell: "seedReggaetonBell", megaSaw: "seedReggaetonMegaSaw",
      third: "seedReggaetonThird", arp: "mrdrAcousticGuitar", counter: "seedReggaetonCounter",
      choir: "seedReggaetonChoir", saws: "tngrWarmStrings", pad: "tngrWarmStrings",
      piano: "seedReggaetonPiano", impact: "seedReggaetonImpact", shaker: "dsShaker",
      tambourine: "seedReggaetonTambourine", congas: "bongoHigh", cowbell: "seedReggaetonCowbell",
      ride: "seedReggaetonRide", fallbackMelodic: "mrdrVocalOh",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds808Kick", snare: "clvRosewood", clap: "clvRosewood",
        hats: "guiraChk", ohats: "seedReggaetonOhats", crash: "seedReggaetonCrash",
        fill: "bongoLow",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["mrdrVocalOh", "tngrAirFlute", "mrdrAcousticGuitar", "tpKalimba", "tngrDataMarimba"],
      counter: ["tngrDataMarimba", "tpKalimba", "koto", "marimba", "tngrWireHarp"],
      bass: ["tngrRoundBass", "stSubSine", "roundBass", "tngrPickedBass"],
      chords: ["tngrWarmStrings", "tngrCloudMemory", "warmPad", "tngrDreamCircuit"],
    },
    choices: {
      saws: ["warmPad"],
      pad: ["tngrCloudMemory", "warmPad"],
      arp: ["tngrWireHarp"],
      choir: ["jmjrChoirAah"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "reggaeton-perreo": {
    parts: {
      bass: "mrdrDist808", sub: "seedReggaetonSub", square: "seedReggaetonSquare",
      squareDense: "marimba", bell: "seedReggaetonBell", megaSaw: "seedReggaetonMegaSaw",
      third: "seedReggaetonThird", arp: "tngrDataMarimba", counter: "seedReggaetonCounter",
      choir: "seedReggaetonChoir", saws: "tngrPolarDrift", pad: "tngrPolarDrift",
      piano: "bestPwmClav", impact: "seedReggaetonImpact", shaker: "seedReggaetonShaker",
      tambourine: "seedReggaetonTambourine", congas: "seedReggaetonCongas", cowbell: "seedReggaetonCowbell",
      ride: "seedReggaetonRide", fallbackMelodic: "tngrDataMarimba",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds808Kick", snare: "snareTight", clap: "snareTight",
        hats: "dsHatClosed", ohats: "ds808OpenHat", crash: "seedReggaetonCrash",
        fill: "seedReggaetonFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["tngrDataMarimba", "bestPwmClav", "marimba", "tngrWireHarp", "tpKalimba"],
      counter: ["tngrDataMarimba", "tpKalimba", "koto", "marimba", "tngrWireHarp"],
      bass: ["mrdrDist808", "stSubSine", "tngrRoundBass", "roundBass"],
      chords: ["bestPwmClav", "tngrPolarDrift", "tngrDreamCircuit", "warmPad"],
    },
    choices: {
      saws: ["warmPad"],
      pad: ["warmPad", "tngrCloudMemory"],
      arp: ["marimba"],
      choir: ["jmjrChoirAah"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "synthwave-outrun": {
    parts: {
      bass: "tngrNightSequence", sub: "stSubSine", square: "tngrHorizonSolo",
      squareDense: "tngrHorizonSolo", bell: "tngrIceBell", megaSaw: "tngrNeonReed",
      third: "tngrDigitalEp84", arp: "tngrCrystalTrigger", counter: "tngrBrassSection",
      choir: "tngrGlassChoir", saws: "tngrWarmStrings", pad: "tngrBurntHorizon",
      piano: "tngrDigitalEp84", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrHorizonSolo",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", crash: "kit_80s_pop_crash",
        fill: "sdsTomHigh",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrHorizonSolo", "tngrBerlinSignal", "tngrNeonReed", "tngrClassicSquare",
        "tngrCrystalTrigger", "tngrRubyScanner"
      ],
      counter: [
        "tngrIceBell", "tngrCrystalTrigger", "tngrDigitalEp84", "rmndDxPiano",
        "tngrBrassSection", "tngrAlloyChime", "tngrNeonReed"
      ],
      bass: [
        "tngrNightSequence", "bass80sFM", "tngrOrangeCurrent", "tngrGlassMotor",
        "tngrHollowVector", "rmndDxPop"
      ],
      chords: [
        "tngrWarmStrings", "tngrSoftStrings", "tngrBrassSection", "tngrGlassChoir",
        "rmndTineEP", "tngrBurntHorizon", "tngrPolarDrift", "tngrDigitalEp84"
      ],
    },
    choices: {
      saws: ["tngrSoftStrings"],
      pad: ["tngrDreamCircuit", "tngrPolarDrift"],
      arp: ["tngrWireHarp", "tngrDataMarimba"],
      bell: ["tngrCelesta", "tngrMusicBell"],
    },
    moods: {
    },
    never: [],
  },
  "synthwave-darksynth": {
    parts: {
      bass: "tngrHollowVector", sub: "stSubSine", square: "tngrRubyScanner",
      squareDense: "tngrHorizonSolo", bell: "tngrIceBell", megaSaw: "tngrNeonReed",
      third: "tngrDigitalEp84", arp: "tngrCrystalTrigger", counter: "tngrBrassSection",
      choir: "tngrGlassChoir", saws: "tngrBurntHorizon", pad: "tngrBurntHorizon",
      piano: "tngrBrassSection", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrRubyScanner",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", crash: "sdsCymbal",
        fill: "sdsTomMid",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrRubyScanner", "tngrBerlinSignal", "tngrHorizonSolo", "tngrClassicSquare",
        "tngrNeonReed"
      ],
      counter: [
        "tngrIceBell", "tngrCrystalTrigger", "tngrDigitalEp84", "rmndDxPiano",
        "tngrBrassSection", "tngrAlloyChime", "tngrNeonReed"
      ],
      bass: ["tngrHollowVector", "tngrGlassMotor", "bass80sFM", "tngrNightSequence"],
      chords: [
        "tngrWarmStrings", "tngrSoftStrings", "tngrBrassSection", "tngrGlassChoir",
        "rmndTineEP", "tngrBurntHorizon", "tngrPolarDrift", "tngrDigitalEp84"
      ],
    },
    choices: {
      saws: ["tngrSoftStrings"],
      pad: ["tngrDreamCircuit", "tngrPolarDrift"],
      arp: ["tngrWireHarp", "tngrDataMarimba"],
      bell: ["tngrCelesta", "tngrMusicBell"],
    },
    moods: {
    },
    never: [],
  },
  "dnb-liquid": {
    parts: {
      bass: "tngrRoundBass", sub: "stSubSine", square: "tngrWireHarp",
      squareDense: "tngrWireHarp", bell: "tngrIceBell", megaSaw: "bestPwmHollowLead",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "tngrAlloyChime",
      choir: "tngrGlassChoir", saws: "bestPwmPadWide", pad: "tngrGlassChoir",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrVocalOh",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "snareTight", clap: "dsCrackSnare2",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["mrdrVocalOh", "rmndTineEP", "tngrAirFlute", "tngrWireHarp", "tngrIceBell"],
      counter: ["tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "rmndTineEP", "tngrWireHarp"],
      bass: ["tngrRoundBass", "tngrNightSequence", "bestReeseBass", "bass80sFM"],
      chords: ["rmndTineEP", "tngrGlassChoir", "tngrPolarDrift", "tngrCloudMemory"],
    },
    choices: {
      saws: ["tngrDreamCircuit"],
      pad: ["tngrPolarDrift", "tngrCloudMemory"],
      arp: ["tngrWireHarp", "bestSampleHoldPulse"],
      choir: ["bestChoirOoh"],
      bell: ["tngrAlloyChime"],
    },
    moods: {
    },
    never: [],
  },
  "dnb-neuro": {
    parts: {
      bass: "bestReeseBass", sub: "tngrDigitalGrowl", square: "tngrWireHarp",
      squareDense: "tngrWireHarp", bell: "tngrIceBell", megaSaw: "bestPwmHollowLead",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "tngrAlloyChime",
      choir: "tngrGlassChoir", saws: "bestPwmPadWide", pad: "tngrPolarDrift",
      piano: "bestPwmClav", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", crash: "kit_neuro_crash",
        fill: "kit_neuro_tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["bestPwmClav", "tngrCrystalTrigger", "tngrWireHarp", "tngrAlloyChime"],
      counter: ["tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "rmndTineEP", "tngrWireHarp"],
      bass: ["bestReeseBass", "tngrHollowVector", "tngrGlassMotor", "detuneBass"],
      chords: ["bestPwmClav", "tngrPolarDrift", "tngrGlassChoir", "rmndTineEP"],
    },
    choices: {
      saws: ["tngrDreamCircuit"],
      pad: ["glassPad", "tngrBurntHorizon", "layerDreamPad"],
      arp: ["tngrWireHarp", "bestSampleHoldPulse"],
      choir: ["bestChoirOoh"],
      bell: ["tngrAlloyChime"],
    },
    moods: {
    },
    never: [],
  },
  "acid-house": {
    parts: {
      bass: "mrdrAcid303", sub: "stSubSine", square: "tngrCrystalTrigger",
      squareDense: "tngrCrystalTrigger", bell: "tngrIceBell", megaSaw: "mrdrHouseOrganStab",
      third: "mrdrHouseOrganStab", arp: "tngrCrystalTrigger", counter: "mrdrHouseOrganStab",
      choir: "jmjrChoirAah", saws: "mrdrRaveStab", pad: "tngrWarmStrings",
      piano: "mrdrHouseOrganStab", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrHouseOrganStab",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrHouseOrganStab", "tngrCrystalTrigger", "rmndTineEP", "mrdrDeepOrganStab",
        "fmBell"
      ],
      counter: ["mrdrHouseOrganStab", "tngrCrystalTrigger", "rmndTineEP", "fmBell"],
      bass: ["mrdrAcid303", "mrdrAcid303Square", "mrdrAcid303Deep", "mrdrAcid303Accent"],
      chords: ["mrdrHouseOrganStab", "mrdrDeepOrganStab", "mrdrRaveStab", "addOrganStab"],
    },
    choices: {
      saws: ["mrdrFestivalStab"],
      pad: ["tngrSoftStrings"],
      arp: ["toneSquare"],
      choir: ["tngrGlassChoir"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  techno: {
    parts: {
      bass: "bestClassicMono", sub: "stSubSine", square: "tngrCrystalTrigger",
      squareDense: "tngrCrystalTrigger", bell: "tngrIceBell", megaSaw: "mrdrRaveStab",
      third: "mrdrRaveStab", arp: "tngrCrystalTrigger", counter: "tngrCrystalTrigger",
      choir: "tngrGlassChoir", saws: "mrdrRaveStab", pad: "tngrWarmStrings",
      piano: "mrdrRaveStab", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrCrystalTrigger",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["tngrCrystalTrigger", "tngrIceBell", "mrdrRaveStab", "fmBell", "tngrPlainPulse"],
      counter: ["tngrCrystalTrigger", "fmBell", "toneSquare", "tngrIceBell"],
      bass: ["bestClassicMono", "bass80sMono", "roundMono2", "mrdrAcid303Deep"],
      chords: ["mrdrRaveStab", "mrdrDeepOrganStab", "mrdrHouseOrganStab", "bestPwmBrass"],
    },
    choices: {
      saws: ["mrdrDeepOrganStab"],
      pad: ["tngrSoftStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  rave: {
    parts: {
      bass: "layerWalkingBass", sub: "stSubSine", square: "mrdrHoover",
      squareDense: "mrdrHoover", bell: "tngrIceBell", megaSaw: "mrdrHoover",
      third: "mrdrPopGrand", arp: "tngrCrystalTrigger", counter: "mrdrPopGrand",
      choir: "bestChoirAah", saws: "mrdrRaveStab", pad: "bestPwmStrings",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "ds909Clap",
        hats: "hatEngine", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrPopGrand", "mrdrHoover", "tngrBrightPiano", "mrdrFestivalStab",
        "bestScreamerLead"
      ],
      counter: ["mrdrPopGrand", "tngrCrystalTrigger", "fmBell", "toneSquare"],
      bass: ["layerWalkingBass", "bestReeseBass", "mrdrDist808", "layerMegamixBass"],
      chords: ["mrdrRaveStab", "mrdrFestivalStab", "mrdrPopGrand", "bestPwmBrass"],
    },
    choices: {
      saws: ["mrdrFestivalStab"],
      pad: ["tngrWarmStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  "uk-garage": {
    parts: {
      bass: "seedUkGarageBass", sub: "seedUkGarageSub", square: "seedUkGarageSquare",
      squareDense: "mrdrVocalOh", bell: "seedUkGarageBell", megaSaw: "seedUkGarageMegaSaw",
      third: "seedUkGarageThird", arp: "seedUkGarageArp", counter: "seedUkGarageCounter",
      choir: "seedUkGarageChoir", saws: "mrdrHouseOrganStab", pad: "seedUkGaragePad",
      piano: "seedUkGaragePiano", impact: "syn3PewDeep", shaker: "seedUkGarageShaker",
      tambourine: "seedUkGarageTambourine", congas: "seedUkGarageCongas", cowbell: "seedUkGarageCowbell",
      ride: "seedUkGarageRide", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "seedUkGarageKick", snare: "seedUkGarageSnare", clap: "seedUkGarageClap",
        hats: "seedUkGarageHats", ohats: "seedUkGarageOhats", crash: "seedUkGarageCrash",
        fill: "seedUkGarageFill",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["rmndTineEP", "mrdrVocalOh", "mrdrHouseOrganStab", "tngrIceBell", "mrdrDeepOrganStab"],
      counter: ["mrdrVocalOh", "mrdrDeepOrganStab", "rmndTineEP", "tngrCrystalTrigger"],
      bass: ["mrdrOrganBass", "mrdrGarageWobble", "tngrRoundBass", "stSubSine"],
      chords: ["mrdrHouseOrganStab", "mrdrDeepOrganStab", "addOrganStab", "rmndTineEP"],
    },
    choices: {
      saws: ["mrdrDeepOrganStab"],
      pad: ["tngrWarmStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  freestyle: {
    parts: {
      bass: "layerBass80s", sub: "stSubSine", square: "fmBell",
      squareDense: "fmBell", bell: "tngrIceBell", megaSaw: "bestHeroLead",
      third: "fmKeys", arp: "tngrCrystalTrigger", counter: "mrdrOrchHit",
      choir: "bestChoirAah", saws: "bestPwmStrings", pad: "bestPwmStrings",
      piano: "mrdrOrchHit", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaHigh", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "fmKeys",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "simple808StyleHat", ohats: "ds808OpenHat", crash: "crash808Long",
        fill: "ds808Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["fmBell", "bestHeroLead", "tngrIceBell", "fmKeys", "toneSquare"],
      counter: ["mrdrOrchHit", "brassStab", "bestPwmBrass", "mrdrHornStab"],
      bass: ["layerBass80s", "bestPwmBass", "mrdrSynthSlap", "syncBassBite"],
      chords: ["bestPwmStrings", "tngrWarmStrings", "synthStrings", "bestPwmBrass"],
    },
    choices: {
      saws: ["tngrWarmStrings"],
      pad: ["tngrWarmStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  "eurobeat-hinrg": {
    parts: {
      bass: "bestClassicMono", sub: "stSubSine", square: "syncRazorLead",
      squareDense: "syncRazorLead", bell: "mrdrPopGrand", megaSaw: "bestHeroLead",
      third: "syncRazorLead", arp: "tngrCrystalTrigger", counter: "bestPwmBrass",
      choir: "bestChoirAah", saws: "stSynthStrings", pad: "stSynthStrings",
      piano: "bestPwmBrass", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "ds909Snare", clap: "clapRoom",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "syncRazorLead", "bestPwmBrass", "tngrBrassSection", "mrdrPopGrand",
        "mrdrElectricGrand", "rmndDxPiano", "roundMono2", "tngrClassicSquare",
        "bestScreamerLead", "bestHeroLead", "bestPwmHollowLead", "bestMegaSawLead",
        "tngrCrystalTrigger"
      ],
      counter: [
        "bestPwmBrass", "tngrBrassSection", "tngrCrystalTrigger", "mrdrElectricGrand",
        "tngrClassicSquare", "bestPwmHollowLead", "rmndDxPiano", "syncRazorLead"
      ],
      bass: [
        "bass80sDuo", "detuneBass", "bass80sFM", "bass80sMono", "bestClassicMono",
        "tngrNightSequence"
      ],
      chords: [
        "bestPwmStrings", "tngrWarmStrings", "bestPwmBrass", "tngrBrassSection",
        "mrdrPopGrand", "rmndTineEP", "tpSuperSaw", "bestChoirAah"
      ],
    },
    choices: {
      saws: ["synthStrings", "bestPwmPadWide"],
      pad: ["tngrSoftStrings", "synthStrings"],
      arp: ["tngrWireHarp", "bestPwmClav"],
      choir: ["bestChoirOoh"],
      bell: ["mrdrElectricGrand", "tngrBrightPiano"],
    },
    moods: {
    },
    never: [],
  },
  "deep-house-piano": {
    parts: {
      bass: "mrdrOrganBass", sub: "stSubSine", square: "mrdrVibraphone",
      squareDense: "mrdrVibraphone", bell: "tngrIceBell", megaSaw: "tngrHorizonSolo",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "mrdrVocalOh",
      choir: "jmjrChoirOoh", saws: "tngrCloudMemory", pad: "tngrCloudMemory",
      piano: "tngrBrightPiano", impact: "syn3PewDeep", shaker: "dsShaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "rmndTineEP", "tngrMemoryOrgan", "mrdrVibraphone", "tngrDigitalEp84",
        "mrdrElectricGrand", "tngrHorizonSolo", "tngrCrystalTrigger", "mrdrDeepOrganStab"
      ],
      counter: ["mrdrVibraphone", "tngrIceBell", "rmndTineEP", "tngrCrystalTrigger", "tngrAlloyChime"],
      bass: ["tngrRoundBass", "roundBass", "tpBassy", "bass80sMono"],
      chords: [
        "rmndTineEP", "tngrMemoryOrgan", "tngrCloudMemory", "epiano", "tngrDigitalEp84",
        "warmPad", "mrdrHouseOrganStab", "mrdrDeepOrganStab", "addOrganStab"
      ],
    },
    choices: {
      saws: ["warmPad"],
      pad: ["warmPad", "tngrPolarDrift"],
      arp: ["tngrWireHarp"],
      choir: ["mrdrVocalOh"],
      bell: ["mrdrVibraphone"],
    },
    moods: {
    },
    never: [],
  },
  "downtempo-triphop": {
    parts: {
      bass: "layerWalkingBass", sub: "stSubSine", square: "cryptTheremin",
      squareDense: "cryptTheremin", bell: "mrdrVibraphone", megaSaw: "mrdrMutedTrumpet",
      third: "rmndTineEP", arp: "mrdrVibraphone", counter: "mrdrVibraphone",
      choir: "jmjrChoirOoh", saws: "tngrSoftStrings", pad: "tngrSoftStrings",
      piano: "rmndTineEP", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaLow", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "fatKick", snare: "snareFat", clap: "snareFat",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds808Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrMutedTrumpet", "mrdrVibraphone", "rmndTineEP", "mrdrClarinet", "wndrFeltPiano",
        "mrdrCello", "mrdrShakuhachi"
      ],
      counter: ["mrdrVibraphone", "mrdrMutedTrumpet", "rmndTineEP", "tngrCelesta", "mrdrClarinet"],
      bass: ["tngrRoundBass", "roundBass", "mrdrContrabass", "tpBassGuitar"],
      chords: ["rmndTineEP", "tngrSoftStrings", "wndrFeltPiano", "tngrFeltUpright", "warmPad"],
    },
    choices: {
      saws: ["tngrWarmStrings"],
      pad: ["tngrWarmStrings"],
      arp: ["wndrFeltPiano"],
      choir: ["jmjrChoirAah"],
      bell: ["tngrCelesta"],
    },
    moods: {
    },
    never: [],
  },
  "electro-funk-newjack": {
    parts: {
      bass: "mrdrSynthSlap", sub: "stSubSine", square: "syncWireClav",
      squareDense: "syncWireClav", bell: "tngrCelesta", megaSaw: "tngrBrassSection",
      third: "rmndDxPiano", arp: "mrdrFunkGuitarMuted", counter: "mrdrOrchHit",
      choir: "jmjrChoirAah", saws: "tngrBrassSection", pad: "tngrWarmStrings",
      piano: "rmndDxPiano", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "tr808CowbellClassic",
      ride: "ride909SixBit", fallbackMelodic: "rmndDxPiano",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds808Kick", snare: "snareFat", clap: "clapRoom",
        hats: "simple808StyleHat", ohats: "ds808OpenHat", crash: "crash808Long",
        fill: "ds808Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "bestVoiceBox70s", "syncVowelLead", "tngrNeonReed", "mrdrSaxophone", "clav",
        "rmndDxPiano", "bestPwmBrass"
      ],
      counter: ["mrdrHornStab", "clav", "mrdrFunkGuitarMuted", "tngrBrassSection", "rmndDxPiano"],
      bass: ["mrdrSynthSlap", "rmndDxSlap", "tngrSlap", "mrdrSlapPop", "rubberBass"],
      chords: [
        "syncWireClav", "clav", "mrdrFunkGuitarMuted", "tngrDigitalEp84", "tngrBrassSection",
        "mrdrFunkGuitar"
      ],
    },
    choices: {
      saws: ["bestPwmBrass"],
      pad: ["tngrSoftStrings"],
      arp: ["mrdrWahGuitar"],
      choir: ["jmjrChoirOoh"],
      bell: ["marimba"],
    },
    moods: {
    },
    never: [],
  },
  "techno-acid": {
    parts: {
      bass: "mrdrAcid303", sub: "stSubSine", square: "tngrCrystalTrigger",
      squareDense: "tngrCrystalTrigger", bell: "tngrIceBell", megaSaw: "mrdrRaveStab",
      third: "mrdrRaveStab", arp: "tngrCrystalTrigger", counter: "tngrCrystalTrigger",
      choir: "tngrGlassChoir", saws: "mrdrRaveStab", pad: "tngrWarmStrings",
      piano: "mrdrRaveStab", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrCrystalTrigger",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "ds909Snare", clap: "ds909Clap",
        hats: "hatEngine", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["tngrCrystalTrigger", "tngrIceBell", "mrdrRaveStab", "fmBell", "tngrPlainPulse"],
      counter: ["tngrCrystalTrigger", "fmBell", "toneSquare", "tngrIceBell"],
      bass: ["bestClassicMono", "bass80sMono", "roundMono2", "mrdrAcid303Deep"],
      chords: ["mrdrRaveStab", "mrdrDeepOrganStab", "mrdrHouseOrganStab", "bestPwmBrass"],
    },
    choices: {
      saws: ["mrdrDeepOrganStab"],
      pad: ["tngrSoftStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  "rave-happy": {
    parts: {
      bass: "layerBass80s", sub: "stSubSine", square: "mrdrFestivalStab",
      squareDense: "mrdrFestivalStab", bell: "tngrIceBell", megaSaw: "mrdrFestivalStab",
      third: "mrdrPopGrand", arp: "tngrCrystalTrigger", counter: "mrdrPopGrand",
      choir: "bestChoirAah", saws: "mrdrRaveStab", pad: "bestPwmStrings",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "ds909Clap",
        hats: "hatEngine", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "mrdrPopGrand", "mrdrHoover", "tngrBrightPiano", "mrdrFestivalStab",
        "bestScreamerLead"
      ],
      counter: ["mrdrPopGrand", "tngrCrystalTrigger", "fmBell", "toneSquare"],
      bass: ["layerWalkingBass", "bestReeseBass", "mrdrDist808", "layerMegamixBass"],
      chords: ["mrdrRaveStab", "mrdrFestivalStab", "mrdrPopGrand", "bestPwmBrass"],
    },
    choices: {
      saws: ["mrdrFestivalStab"],
      pad: ["tngrWarmStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  "uk-garage-speed": {
    parts: {
      bass: "mrdrGarageWobble", sub: "stSubSine", square: "mrdrVocalOh",
      squareDense: "mrdrVocalOh", bell: "tngrIceBell", megaSaw: "mrdrHouseOrganStab",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "mrdrVocalOh",
      choir: "jmjrChoirOoh", saws: "mrdrHouseOrganStab", pad: "tngrCloudMemory",
      piano: "mrdrHouseOrganStab", impact: "syn3PewDeep", shaker: "dsShaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "rim909TwoMode", clap: "clapTight",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: ["rmndTineEP", "mrdrVocalOh", "mrdrHouseOrganStab", "tngrIceBell", "mrdrDeepOrganStab"],
      counter: ["mrdrVocalOh", "mrdrDeepOrganStab", "rmndTineEP", "tngrCrystalTrigger"],
      bass: ["mrdrOrganBass", "mrdrGarageWobble", "tngrRoundBass", "stSubSine"],
      chords: ["mrdrHouseOrganStab", "mrdrDeepOrganStab", "addOrganStab", "rmndTineEP"],
    },
    choices: {
      saws: ["mrdrDeepOrganStab"],
      pad: ["tngrWarmStrings"],
      arp: ["toneSquare"],
      choir: ["jmjrChoirAah"],
      bell: ["fmBell"],
    },
    moods: {
    },
    never: [],
  },
  "dnb-jungle": {
    parts: {
      bass: "layerWalkingBass", sub: "stSubSine", square: "tngrWireHarp",
      squareDense: "tngrWireHarp", bell: "tngrIceBell", megaSaw: "bestPwmHollowLead",
      third: "rmndTineEP", arp: "tngrCrystalTrigger", counter: "tngrAlloyChime",
      choir: "tngrGlassChoir", saws: "tngrSoftStrings", pad: "tngrSoftStrings",
      piano: "mrdrHornStab", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "rmndTineEP",
    },
    kits: {
      "808": {
        kick: "tr808Kick", snare: "tr808Snare", clap: "tr808Clap",
        hats: "tr808ClosedHat", ohats: "tr808OpenHat", crash: "tr808Cymbal",
        fill: "tr808Tom",
      },
      "909": {
        kick: "tr909Kick", snare: "tr909Snare", clap: "tr909Clap",
        hats: "tr909ClosedHat", ohats: "tr909OpenHat", crash: "ds909Crash",
        fill: "tr909Tom",
      },
      style: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", crash: "kit_breakbeat_crash",
        fill: "kit_breakbeat_tom",
      },
      studio: {
        kick: "ds909KickPunch", snare: "snareCrisp", clap: "clap808",
        hats: "hatEngine", ohats: "hatOpen", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      ds: {
        kick: "dsKick", snare: "dsSnare", clap: "dsClap",
        hats: "dsHatClosed", ohats: "dsHatOpen", fill: "dsTom",
      },
      cr78: {
        kick: "cr78Kick", snare: "cr78Snare", clap: "cr78Tambourine",
        hats: "cr78Hat", crash: "cr78Cymbal", fill: "cr78Conga",
      },
      glasshouse: {
        kick: "kit_glasshouse_kick", snare: "kit_glasshouse_snare", clap: "kit_glasshouse_clap",
        hats: "kit_glasshouse_hats", ohats: "kit_glasshouse_ohats", fill: "kit_glasshouse_tom",
        crash: "kit_glasshouse_crash",
      },
      "havana-patio": {
        kick: "kit_havana_patio_kick", snare: "kit_havana_patio_snare", clap: "kit_havana_patio_clap",
        hats: "kit_havana_patio_hats", ohats: "kit_havana_patio_ohats", fill: "kit_havana_patio_tom",
        crash: "kit_havana_patio_crash",
      },
      "moon-dust": {
        kick: "kit_moon_dust_kick", snare: "kit_moon_dust_snare", clap: "kit_moon_dust_clap",
        hats: "kit_moon_dust_hats", ohats: "kit_moon_dust_ohats", fill: "kit_moon_dust_tom",
        crash: "kit_moon_dust_crash",
      },
      "neon-origami": {
        kick: "kit_neon_origami_kick", snare: "kit_neon_origami_snare", clap: "kit_neon_origami_clap",
        hats: "kit_neon_origami_hats", ohats: "kit_neon_origami_ohats", fill: "kit_neon_origami_tom",
        crash: "kit_neon_origami_crash",
      },
      "pocket-pixel": {
        kick: "kit_pocket_pixel_kick", snare: "kit_pocket_pixel_snare", clap: "kit_pocket_pixel_clap",
        hats: "kit_pocket_pixel_hats", ohats: "kit_pocket_pixel_ohats", fill: "kit_pocket_pixel_tom",
        crash: "kit_pocket_pixel_crash",
      },
      "rio-lanterns": {
        kick: "kit_rio_lanterns_kick", snare: "kit_rio_lanterns_snare", clap: "kit_rio_lanterns_clap",
        hats: "kit_rio_lanterns_hats", ohats: "kit_rio_lanterns_ohats", fill: "kit_rio_lanterns_tom",
        crash: "kit_rio_lanterns_crash",
      },
      "rubber-factory": {
        kick: "kit_rubber_factory_kick", snare: "kit_rubber_factory_snare", clap: "kit_rubber_factory_clap",
        hats: "kit_rubber_factory_hats", ohats: "kit_rubber_factory_ohats", fill: "kit_rubber_factory_tom",
        crash: "kit_rubber_factory_crash",
      },
      "velvet-basement": {
        kick: "kit_velvet_basement_kick", snare: "kit_velvet_basement_snare", clap: "kit_velvet_basement_clap",
        hats: "kit_velvet_basement_hats", ohats: "kit_velvet_basement_ohats", fill: "kit_velvet_basement_tom",
        crash: "kit_velvet_basement_crash",
      },
      "80s-pop": {
        kick: "kit_80s_pop_kick", snare: "kit_80s_pop_snare", clap: "kit_80s_pop_clap",
        hats: "kit_80s_pop_hats", ohats: "kit_80s_pop_ohats", fill: "kit_80s_pop_tom",
        crash: "kit_80s_pop_crash",
      },
      breakbeat: {
        kick: "kit_breakbeat_kick", snare: "kit_breakbeat_snare", clap: "kit_breakbeat_clap",
        hats: "kit_breakbeat_hats", ohats: "kit_breakbeat_ohats", fill: "kit_breakbeat_tom",
        crash: "kit_breakbeat_crash",
      },
      nes: {
        kick: "kit_nes_kick", snare: "kit_nes_snare", clap: "kit_nes_clap",
        hats: "kit_nes_hats", ohats: "kit_nes_ohats", fill: "kit_nes_tom",
        crash: "kit_nes_crash",
      },
      simmons: {
        kick: "sdsKick", snare: "sdsSnare", clap: "kit_simmons_clap",
        hats: "kit_simmons_hats", ohats: "kit_simmons_ohats", fill: "sdsTomMid",
        crash: "sdsCymbal",
      },
      neuro: {
        kick: "kit_neuro_kick", snare: "kit_neuro_snare", clap: "kit_neuro_clap",
        hats: "kit_neuro_hats", ohats: "kit_neuro_ohats", fill: "kit_neuro_tom",
        crash: "kit_neuro_crash",
      },
      brushes: {
        kick: "kit_brushes_kick", snare: "kit_brushes_snare", clap: "kit_brushes_clap",
        hats: "kit_brushes_hats", ohats: "kit_brushes_ohats", fill: "kit_brushes_tom",
        crash: "kit_brushes_crash",
      },
      "syndrum-disco": {
        kick: "kit_syndrum_disco_kick", snare: "kit_syndrum_disco_snare", clap: "kit_syndrum_disco_clap",
        hats: "kit_syndrum_disco_hats", ohats: "kit_syndrum_disco_ohats", fill: "kit_syndrum_disco_tom",
        crash: "kit_syndrum_disco_crash",
      },
    },
    random: {
      hook: [
        "tngrWireHarp", "tngrIceBell", "rmndTineEP", "tngrCrystalTrigger", "bestPwmHollowLead",
        "tngrAlloyChime", "mrdrElectricGrand", "epiano"
      ],
      counter: ["tngrIceBell", "tngrAlloyChime", "tngrCrystalTrigger", "rmndTineEP", "tngrWireHarp"],
      bass: ["bestReeseBass", "syncBassBite", "bestClassicMono", "detuneBass"],
      chords: [
        "tngrPolarDrift", "glassPad", "tngrGlassChoir", "rmndTineEP", "bestPwmPadWide",
        "tngrDreamCircuit"
      ],
    },
    choices: {
      saws: ["tngrDreamCircuit"],
      pad: ["glassPad", "tngrBurntHorizon", "layerDreamPad"],
      arp: ["tngrWireHarp", "bestSampleHoldPulse"],
      choir: ["bestChoirOoh"],
      bell: ["tngrAlloyChime"],
    },
    moods: {
    },
    never: [],
  },
};
