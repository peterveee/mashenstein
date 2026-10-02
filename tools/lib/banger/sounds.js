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
      bass: "detuneBass", sub: "stSubSine", square: "roundMono2",
      squareDense: "initSquare", bell: "tngrIceBell", megaSaw: "bestMegaSawLead",
      third: "mrdrElectricGrand", arp: "tngrCrystalTrigger", counter: "tngrCrystalTrigger",
      choir: "bestChoirAah", saws: "tpSuperSaw", pad: "tngrPolarDrift",
      piano: "mrdrElectricGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrElectricGrand",
    },
    kits: {
      "808": {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "dsSnare", clap: "bigRoomClap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "crash808Long",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
    },
    never: [],
  },
  trance: {
    parts: {
      bass: "tngrNightSequence", sub: "stSubSine", square: "tpSuperSaw",
      squareDense: "bestMegaSawLead", bell: "tngrIceBell", megaSaw: "bestMegaSawLead",
      third: "mrdrPopGrand", arp: "tngrCrystalTrigger", counter: "tngrCrystalTrigger",
      choir: "bestChoirAah", saws: "tpSuperSaw", pad: "tngrGlassChoir",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      style: {
        kick: "ds909KickPunch", snare: "dsSnare", clap: "bigRoomClap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "crash808Long",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
    },
    never: [],
  },
  "future-bass": {
    parts: {
      bass: "tngrRoundBass", sub: "wubGlassYoi", square: "jmjrAiueo",
      squareDense: "initSquare", bell: "musicBox", megaSaw: "bestMegaSawLead",
      third: "mrdrPopGrand", arp: "tngrCrystalTrigger", counter: "celeste2",
      choir: "bestChoirAah", saws: "tpSuperSaw", pad: "tngrGlassChoir",
      piano: "mrdrPopGrand", impact: "syn3PewDeep", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "mrdrPopGrand",
    },
    kits: {
      "808": {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
      },
      style: {
        kick: "kickClickTop", snare: "dsSnare", clap: "clapRoom",
        hats: "dsHatClosed", ohats: "hatSnapOpen", crash: "ds909Crash",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
    },
    never: [],
  },
  chipstep: {
    parts: {
      bass: "tngrClassicSquare", sub: "wubClassic", square: "tngrPlainPulse",
      squareDense: "tngrPlainPulse", bell: "toneSquare", megaSaw: "bestScreamerLead",
      third: "jmjrArcadeChorus", arp: "toneSquare", counter: "tngrClassicSquare",
      choir: "bestPwmChoir", saws: "bestPwmPadWide", pad: "bestPwmStrings",
      piano: "initSquare", impact: "kwBlipDrop", shaker: "shaker",
      tambourine: "tambourine", congas: "congaMid", cowbell: "ds808Cowbell",
      ride: "ride909SixBit", fallbackMelodic: "tngrPlainPulse",
    },
    kits: {
      "808": {
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
        kick: "ds808Kick", snare: "ds808Snare", clap: "ds808Clap",
        hats: "hatGrit", ohats: "ds808OpenHat", fill: "ds808Tom",
      },
      "909": {
        kick: "ds909Kick", snare: "ds909Snare", clap: "ds909Clap",
        hats: "dsHatClosed", ohats: "ds909OpenHat", crash: "ds909Crash",
        fill: "ds909Tom",
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
        kick: "dsCr78Kick", snare: "dsCr78Snare", clap: "dsCr78Clap",
        hats: "dsCr78Hat", fill: "dsCr78Tom",
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
    },
    never: [],
  },
};
