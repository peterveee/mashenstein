// Audited factory filing, separate from playback categories. IDs keep filing stable across renames.
// Add new factory presets here; old/user/song-local presets also have a compatibility fallback.
const GROUPS = [
  ['Strings', 'Solo', 'frppViolin frppCello frppErhu'],
  ['Strings', 'Ensemble', 'frppStringSection'],
  ['Bass', 'Electric', 'frppFretlessBass'],
  ["Bass", "Electric",
    "tpBassGuitar tngrPickedBass mrdrSlapThumb mrdrSlapPop mrdrFretClack" + " " +
    "frppBassNeck frppBassBridge"
  ],
  ["Bass", "Sub",
    "mrdrDist808 rm7RingSub"
  ],
  ["Bass", "Synth",
    "engFilteredSaw engFilteredSawOpen eng80s eng80sSaw engTitleBass" + " " +
    "engFinaleBass engFinaleBassRepeat engMegamixBass engShopBass engLoungeBass" + " " +
    "engWalkingBass engBright80sBass roundMono fmGrowl acidSquelch" + " " +
    "rubberBass clangBass detuneBass tpBassy fmGrowl2" + " " +
    "bass80sMono bass80sFM bass80sDuo bass80sSynth bass303Squelch" + " " +
    "bass303Rubber bass303DeepGlide bass303Bite bass303Pulse layerBass80s" + " " +
    "layerFilteredSaw layerTitleBass layerFinaleBass layerFinaleBassGhost layerWalkingBass" + " " +
    "layerMegamixBass layerShopBass layerLoungeBass layerBright80sBass bestSampleHoldBass" + " " +
    "syncBassBite bestMonsterBass bestReeseBass bestPwmBass bestPwmGrowlBass" + " " +
    "tngrOrangeCurrent tngrGlassMotor tngrNightSequence tngrHollowVector tngrDigitalGrowl" + " " +
    "tngrRoundBass rmndDxSlap rmndDxPop rmndDigitalSlap mrdrSynthSlap" + " " +
    "tngrSlap mrdrMegaPop mrdrWirePop mrdrZapPop rmndMaxPop" + " " +
    "rmndClangPop rmndSquarePop tngrMegaPop mrdrAcid303 mrdrAcid303Accent" + " " +
    "mrdrAcid303Square mrdrAcid303Deep mrdrOrganBass mrdrGarageWobble rm7WahBass" + " " +
    "rm7LaserBass rm7MonsterGrowl rm7AcidFm rm7ReeseFm rm7OctaverBass" + " " +
    "frppSynthBass frppAcidPluck mrdrFmWub"
  ],
  ["Bells & Mallets", "Bells",
    "engTitleTwinkle engShopTwinkle fmBell addBell tngrIceBell" + " " +
    "tngrAlloyChime tngrMusicBell tngrChurchBell mrdrTollingBell darkMetalChime" + " " +
    "rm7RingBell rm7GlassRing rm7BellLead"
  ],
  ["Bells & Mallets", "Tuned Percussion",
    "celeste marimba musicBox tpMarimba tpSteelpan" + " " +
    "tpKalimba tngrDataMarimba tngrCelesta squareVSMono mrdrVibraphone" + " " +
    "rm7TempleGong frppDulcimer frppKalimba"
  ],
  ["Brass", "Ensemble",
    "brassStab layerBrassStack tngrBrassSection mrdrHornStab"
  ],
  ["Brass", "Solo",
    "hornSwell tngrSoftHorn mrdrMutedTrumpet mrdrTuba mrdrFrenchHorn"
  ],
  ["Brass", "Synth Brass",
    "tpBrassCircuit bestPwmBrass rm7DxBrass rm7AmBrassLead"
  ],
  ["Drums & Percussion", "Clap",
    "engClap kit_glasshouse_clap kit_havana_patio_clap kit_moon_dust_clap kit_neon_origami_clap" + " " +
    "kit_pocket_pixel_clap kit_rio_lanterns_clap kit_rubber_factory_clap kit_velvet_basement_clap kit_80s_pop_clap" + " " +
    "kit_neuro_clap kit_syndrum_disco_clap tr808Clap tr909Clap dsClap" + " " +
    "clapHands clapEngine ds909Clap dsCr78Clap ds808Clap" + " " +
    "clapMetal clapFm clap808 clapTight clapRoom"
  ],
  ["Drums & Percussion", "Cymbals",
    "engCrash engFinaleCrash kit_glasshouse_crash kit_havana_patio_crash kit_moon_dust_crash" + " " +
    "kit_neon_origami_crash kit_pocket_pixel_crash kit_rio_lanterns_crash kit_rubber_factory_crash kit_velvet_basement_crash" + " " +
    "kit_80s_pop_crash kit_breakbeat_crash kit_nes_crash kit_neuro_crash kit_brushes_crash" + " " +
    "tr808Cymbal cr78Cymbal crashEngine crashFinale engineCrash" + " " +
    "ds909Crash rideSosTwoPath rideSosFullTail cy808Cymbal crash808Long" + " " +
    "ride909SixBit sdsCymbal"
  ],
  ["Drums & Percussion", "Electronic Perc.",
    "rm7RingTin kit_nes_clap kit_neuro_rim vl1Pi vl1Po" + " " +
    "gateClang kwBlipPing kwBlipSnap kwBlipWood kwBlipGlass" + " " +
    "kwBlipTick kwBlipDrop kwBlipDouble syn3RingBell"
  ],
  ["Drums & Percussion", "Hand Percussion",
    "clave woodBlock kit_havana_patio_tom kit_havana_patio_rim kit_rio_lanterns_tom" + " " +
    "kit_rio_lanterns_rim cr78Conga cr78Tambourine dsKickHard dsShaker" + " " +
    "vl1Sha dsCr78Cowbell ds808Cowbell tr808CowbellClassic tr808CowbellLow" + " " +
    "tr808CowbellHard congaHigh congaMid congaLow congaSlap" + " " +
    "guiraScrape guiraChk tambora djembeBass djembeTone" + " " +
    "djembeSlap talkingDrum bongoHigh bongoLow shekere" + " " +
    "cbSosTriangle cbSosLongTail cb808Unclamped cbStruckRing cbAgogoWide" + " " +
    "clvSosBridgedT clv808Hard clvRosewood clvBrightSnap clvDoubleStrike" + " " +
    "shaker tambourine metalHit"
  ],
  ["Drums & Percussion", "Hats",
    "engHat engOpenHat kit_glasshouse_hats kit_glasshouse_ohats kit_havana_patio_hats" + " " +
    "kit_havana_patio_ohats kit_moon_dust_hats kit_moon_dust_ohats kit_neon_origami_hats kit_neon_origami_ohats" + " " +
    "kit_pocket_pixel_hats kit_pocket_pixel_ohats kit_rio_lanterns_hats kit_rio_lanterns_ohats kit_rubber_factory_hats" + " " +
    "kit_rubber_factory_ohats kit_velvet_basement_hats kit_velvet_basement_ohats kit_80s_pop_hats kit_80s_pop_ohats" + " " +
    "kit_breakbeat_hats kit_breakbeat_ohats kit_nes_hats kit_nes_ohats kit_simmons_hats" + " " +
    "kit_simmons_ohats kit_neuro_hats kit_neuro_ohats kit_brushes_hats kit_brushes_ohats" + " " +
    "kit_syndrum_disco_hats kit_syndrum_disco_ohats tr808ClosedHat tr808OpenHat tr909ClosedHat" + " " +
    "tr909OpenHat cr78Hat dsHatClosed dsHatOpen hatSnapOpen" + " " +
    "hatGrit hatGritOpen hatClusterOpen hatEngine ohatEngine" + " " +
    "dsClosedHat2 ds909OpenHat dsCr78Hat ds808OpenHat ohatSustainMetal" + " " +
    "ohatSustainAir ohatSustainWash ohat808Bands ohat808Long ohat909SixBit" + " " +
    "ohat909Long hatOpen hatFoilOpen"
  ],
  ["Drums & Percussion", "Kick",
    "engKick engShopKick engCounterKick engMegamixKick kit_glasshouse_kick" + " " +
    "kit_havana_patio_kick kit_moon_dust_kick kit_neon_origami_kick kit_pocket_pixel_kick kit_rio_lanterns_kick" + " " +
    "kit_rubber_factory_kick kit_velvet_basement_kick kit_80s_pop_kick kit_breakbeat_kick kit_nes_kick" + " " +
    "kit_neuro_kick kit_brushes_kick kit_syndrum_disco_kick tr808Kick tr909Kick" + " " +
    "cr78Kick dsKick kickCrush kickClickTop kickEngine" + " " +
    "kickShop kickMegamix ds909Kick ds909KickPunch dsCr78Kick" + " " +
    "ds808Kick sdsKick"
  ],
  ["Drums & Percussion", "Other",
    "taikoHit timpaniHit"
  ],
  ["Drums & Percussion", "Rim",
    "engRim kit_glasshouse_rim kit_moon_dust_rim kit_neon_origami_rim kit_pocket_pixel_rim" + " " +
    "kit_rubber_factory_rim kit_velvet_basement_rim kit_80s_pop_rim kit_breakbeat_rim kit_nes_rim" + " " +
    "kit_simmons_rim kit_brushes_rim tr808Rim tr909Rim cr78Rim" + " " +
    "dsRim rimRing rimWood rimClang rimEngine" + " " +
    "ds909Rim rimshot808 rimshotWood rimshotLaser rim808BridgedT" + " " +
    "rim909TwoMode rimShotHard"
  ],
  ["Drums & Percussion", "Snare",
    "engSnare kit_glasshouse_snare kit_havana_patio_snare kit_moon_dust_snare kit_neon_origami_snare" + " " +
    "kit_pocket_pixel_snare kit_rio_lanterns_snare kit_rubber_factory_snare kit_velvet_basement_snare kit_80s_pop_snare" + " " +
    "kit_breakbeat_snare kit_breakbeat_clap kit_nes_snare kit_simmons_clap kit_neuro_snare" + " " +
    "kit_brushes_snare kit_brushes_clap kit_syndrum_disco_snare tr808Snare tr909Snare" + " " +
    "cr78Snare dsSnare dsSnareCrack snarePink snareTwoBody" + " " +
    "snareEngine dsCrackSnare2 ds909Snare ds909SnareCrack dsCr78Snare" + " " +
    "ds808Snare sdCrack sdsSnare snareFlam buzzRoll" + " " +
    "snareCrisp snareFat snareTight snare808Bright snare808Snappy" + " " +
    "snare909Bright snare909Punch snareSimmonsPew snareSimmonsCrack snare80sGated" + " " +
    "snare80sLinn snareCR78Bright snareCR78Accent snareBrightCrack snareWiresTight"
  ],
  ["Drums & Percussion", "Toms",
    "engTom rm7FmTom kit_glasshouse_tom kit_moon_dust_tom kit_neon_origami_tom" + " " +
    "kit_pocket_pixel_tom kit_rubber_factory_tom kit_velvet_basement_tom kit_80s_pop_tom kit_breakbeat_tom" + " " +
    "kit_nes_tom kit_neuro_tom kit_brushes_tom tr808Tom tr909Tom" + " " +
    "dsTom tomSimmons tomEngine ds909Tom dsCr78Tom" + " " +
    "ds808Tom sdsTomHigh sdsTomMid sdsTomLow"
  ],
  ["Effects", "Blips",
    "rm7LaserZap rm7RingZap dsZap syn3Zap"
  ],
  ["Effects", "Impacts",
    "mrdrOrchHit noiseSweep blastBoom blastThunder blastImpact" + " " +
    "blastNoiseCrash blastBolt blastGated"
  ],
  ["Effects", "Sweeps",
    "tngrScannerSweep rm7Riser kit_syndrum_disco_tom kit_syndrum_disco_crash syn3Deooom" + " " +
    "syn3Whoosh sdDiscoTom sdHighPew sdRise syn3PewLong" + " " +
    "syn3PewSnap syn3PewPew syn3PewDeep syn3PewFormant"
  ],
  ["Effects", "Textures",
    "ringMod bestPwmDrift tngrTransmission coyoteHowl rm7Chopper"
  ],
  ["Guitars", "Acoustic",
    "mrdrAcousticGuitar rm7NylonGuitar rm7SteelAcoustic rm7TwelveString frppSteelAcoustic" + " " +
    "frppSteelAcousticShimmer frppNylon frppNylonShimmer frppTwelveString"
  ],
  ["Guitars", "Clean Electric",
    "mrdrWahGuitar mrdrFunkGuitar rm7JazzGuitar rm7CleanElectric rm7FunkChop" + " " +
    "rm7GuitarHarmonics rm7TremoloGuitar frppCleanElectric frppCleanElectricShimmer frppElectricNeck" + " " +
    "frppElectricBridge frppFunkRhythm frppFunkBright frppSlideGuitar"
  ],
  ["Guitars", "Muted",
    "mrdrFunkGuitarMuted frppPalmMuted frppFunkMuted"
  ],
  ["Keys", "Clav",
    "clav syncWireClav bestPwmClav tngrPhaseClav rm7AmClav"
  ],
  ["Keys", "Electric Piano",
    "fmKeys epiano tngrDigitalEp84 tngrElectricKeys mrdrElectricGrand" + " " +
    "rmndDxPiano rmndTineEP mrdrDx7Keys rm7PhasedEp rm7TremoloKeys"
  ],
  ["Keys", "Harpsichord",
    "mrdrHarpsichord"
  ],
  ["Keys", "Piano",
    "toyPiano tpPianoetta tngrSoftPiano tngrBrightPiano wndrConcertGrand" + " " +
    "wndrOldUpright wndrFeltPiano mrdrGrand mrdrPopGrand tngrConcertGrand" + " " +
    "tngrFeltUpright"
  ],
  ["Keys", "Synth Keys",
    "engSine engFinaleStab engFinaleSawStab engShopComp softKeys" + " " +
    "tpTiny toneSine initSquare initSaw initSquareSub" + " " +
    "initSawSub initOneFilter layerTwinkle layerFinaleStab layerFinaleSawStab" + " " +
    "layerShopComp bestSampleHoldPulse tngrHollowKeys mrdrRaveStab rm7StutterStab"
  ],
  ["Leads", "Analog-style",
    "engSquare engSaw engTriangle engBright engTitleLead" + " " +
    "engFinaleLead engMegamixLead engShopLead engCounterLead engTitleHarm" + " " +
    "engSineHarm simpleSquare simpleSawtooth simpleTriangle monoBright" + " " +
    "amHollow duoDetune screamLead buzzSaw tpCoolGuy" + " " +
    "tpLectric tpSuperSaw tpThinSaws roundMono2 toneSquare" + " " +
    "toneSawtooth toneTriangle squareTone2 layerLeadBright layerTitleLead" + " " +
    "layerFinaleLead layerMegamixLead layerShopLead layerCounterLead layerTitleHarm" + " " +
    "layerSineHarm cryptTheremin bestSampleHoldCircuit syncRazorLead bestMegaSawLead" + " " +
    "bestHeroLead bestScreamerLead bestPwmHollowLead bestClassicMono tngrBerlinSignal" + " " +
    "tngrRubyScanner tngrHorizonSolo tngrSatelliteWire tngrPlainSaw tngrPlainPulse" + " " +
    "tngrClassicSquare mrdrFestivalStab mrdrHoover rm7GlideLead rm7AmTheremin" + " " +
    "rm7OctaveLead"
  ],
  ["Leads", "Digital",
    "glassLead hardFm rm7ScreamLead rm7OvermodLead rm7RadioRing" + " " +
    "rm7SyncLead rm7RingSawLead mrdrFmScreamerHeld mrdrFmHeroHeld mrdrFmPulseLead" + " " +
    "mrdrFmHollowLead"
  ],
  ["Leads", "Vocal/Formant",
    "vibratoLead tpBah bestPwmReedLead tngrNeonReed rm7RingRobot" + " " +
    "rm7ReedLead rm7AmReed"
  ],
  ["Organs", "Digital",
    "engLayawayOrgan engHeldOrgan amOrgan fullOrgan tpHarmonics" + " " +
    "tngrMemoryOrgan mrdrHouseOrganStab mrdrDeepOrganStab mrdrFmOrgan"
  ],
  ["Organs", "Drawbar",
    "engDrawbar engDrawbarBright engDrawbarPerc engShopOrgan addDrawbar" + " " +
    "addDrawbarBright addOrganStab addDrawbarPerc addShopOrgan addSwoop" + " " +
    "shopOrgan2"
  ],
  ["Organs", "Pipe",
    "mrdrPedalOrgan"
  ],
  ["Organs", "Reed",
    "reedOrgan"
  ],
  ["Organs", "Transistor",
    "squareOrgan"
  ],
  ["Pads", "Evolving",
    "bestSampleHoldOrbit syncOrbitPad tngrDreamCircuit rm7SweepPad rm7PulsingPad"
  ],
  ["Pads", "Strings",
    "frppSwelledString"
  ],
  ["Pads", "Textures",
    "engTitleChords glassPad addGlassPad layerTitleChords layerDreamPad" + " " +
    "bestPwmPadWide tngrPolarDrift tngrBlueCathedral rm7CrystalPad rm7ShimmerPad" + " " +
    "rm7DarkDrone rm7RingPad rm7HaloPad rm7UnderwaterPad mrdrFmShimmerPad"
  ],
  ["Pads", "Warm",
    "padTriangle warmPad tngrCloudMemory rm7WarmPad"
  ],
  ["Strings", "Ensemble",
    "synthStrings mrdrViolinSection bestPwmStrings tngrWarmStrings tngrSoftStrings" + " " +
    "rm7BeatingStrings rm7DxStrings"
  ],
  ["Strings", "Plucked",
    "harpPluck koto tpPizz tngrWireHarp frppBanjo" + " " +
    "frppHarp frppHarpShimmer frppKoto frppSitar frppTanpura" + " " +
    "frppMandolin"
  ],
  ["Strings", "Solo",
    "tpElectricCello mrdrViolin mrdrViolinMarcato mrdrViola mrdrCello" + " " +
    "mrdrContrabass"
  ],
  ["Synth Plucks", "Metallic",
    "rm7SteelPluck"
  ],
  ["Synth Plucks", "Resonant",
    "frppFilterSlam"
  ],
  ["Synth Plucks", "Short",
    "synthPluck tpTreeTrunk tngrCrystalTrigger"
  ],
  ["Voices", "Choir",
    "tpAlienChorus bestChoirAah bestChoirOoh bestPwmChoir tngrGlassChoir" + " " +
    "jmjrChoirAah jmjrChoirOoh jmjrOldChorister jmjrArcadeChorus rm7GlassChoir" + " " +
    "rm7AmChoir"
  ],
  ["Voices", "Speech",
    "jmjrAnnouncer jmjrEggshellSays jmjrCabinetVoice jmjrWordPerKey"
  ],
  ["Voices", "Synthetic",
    "bestSampleHoldVox bestVoiceBox70s bestRobotVox jmjrDoowop jmjrRobotChant" + " " +
    "jmjrSmallVoice jmjrHumsClosed jmjrScoopLead jmjrFormantMachine jmjrTitanDrone" + " " +
    "jmjrBreathPluck jmjrDooWopLine jmjrBahWahChant jmjrHummer jmjrHumItClosed" + " " +
    "jmjrKazooLead mrdrFmRobotHeld"
  ],
  ["Voices", "Vowels",
    "bestVowelPad syncVowelLead tngrBurntHorizon jmjrOohOpens jmjrAiueo" + " " +
    "mrdrVocalOh rm7VowelPad"
  ],
  ["Winds", "Flute",
    "mrdrConcertFlute mrdrShakuhachi mrdrPanFlute mrdrRecorder mrdrBansuri" + " " +
    "mrdrOcarina tngrAirFlute rm7FluteLead"
  ],
  ["Winds", "Reeds",
    "reedLead breathPad tpDelicateWind mrdrClarinet mrdrOboe"
  ],
  ["Winds", "Saxophone",
    "mrdrSaxophone"
  ],
];

export const FACTORY_PRESET_BROWSING = Object.fromEntries(GROUPS.flatMap(([category, subcategory, ids]) =>
  ids.split(" ").map((id) => [id, { category, subcategory }])));
