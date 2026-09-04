// Obstacle/pickup type registry. All hitboxes are style-independent.
// alt = altitude of the entity's BOTTOM above ground (flyers); ground types sit on it.
// Action classes drive fairness: 'jump' | 'duck' | 'none' (avoidable by running).

export const OBSTACLES = {
  // `skins`: three reds to one green, so a green one is an occasional visitor
  // rather than half the desert. Skin is picked off the spawn position (see
  // makeObstacle), so the mix is stable per instance and identical on a replay.
  // Purely cosmetic — same box, same debris, same jump.
  cactus:      { w: 13, h: 12, sprite: 'cactus', ground: true, breakable: true, action: 'jump', skins: ['cactus', 'cactus', 'cactusGreen', 'cactus'] },
  cactusBig:   { w: 17, h: 14, sprite: 'cactusBig', ground: true, breakable: true, action: 'jump' },
  snowman:     { w: 13, h: 12, sprite: 'snowman', ground: true, breakable: true, action: 'jump' },
  snowmanBig:  { w: 17, h: 14, sprite: 'snowmanBig', ground: true, breakable: true, action: 'jump' },
  crate:      { w: 12, h: 11, sprite: 'crate', ground: true, breakable: true, action: 'jump', stack: true },
  // KICKABLE, and heavily — see `punt` on trafficCone below for the contract,
  // and HEAVY_PUNT in punt.js for why a barrel does not fly like a cone. The
  // barrel is the one puntable prop that is already MOVING when the boot
  // arrives: it rolls at the hero rather than waiting for him, so the timing
  // read the punt window asks for is against a closing target.
  //
  // And the boot REVERSES it. Where a cone is punted up and comes back down
  // into the player's world to be juggled, a barrel goes up, comes down facing
  // the other way and rolls out of the frame faster than the hero can run (see
  // HEAVY_PUNT). It is not destroyed and not resolved — the thing that was
  // coming at you is now leaving, which is what kicking a heavy rolling object
  // actually does. `punt` does not change what the spawner budgets: the barrel
  // is still `action: 'jump'`, and the slide is still the ALTERNATIVE.
  //
  // EXCEPT ON A BEAT LANE, which is what `beatPunt` is for. It is the same flag
  // `beatShoot` is on cardBox below — the mark that says a def may stand as the
  // physical half of a chart slot — and it says this one answers to a DUCK
  // there while staying `action: 'jump'` everywhere else. Both readings are
  // true of the object and neither is a compromise: off the grid a rolling
  // barrel is a thing you hop and the kick is a flourish, and on the grid the
  // kick is the beat, because a hazard that is closing on you is the one read
  // this cabinet has never asked for. See beatchart.js.
  barrel:     { w: 13, h: 13, sprite: 'barrel', ground: true, breakable: true, action: 'jump', beatPunt: true, vx: -40, roll: true, punt: 'heavy', puntLabel: 'BARREL' },
  // Two bodies, one drone: the rotor workhorse and the watching eye. See `skin`
  // in makeObstacle — it is a look, not a variant hazard.
  //
  // `artLift` IS THE SLIDE'S HEADROOM, and it is the only lever there is. 13 is
  // not a taste decision — a standing hero's box is 14 tall, so a drone one
  // pixel higher stops touching him and stops being an obstacle at all, which
  // is the same thing the spawner refuses to let a pattern do. Meanwhile the
  // shipped duck is the POWER SLIDE (toons.js drawDuckSlide), whose whole
  // thesis is a head left upright and camera-facing, and it draws 19 to 21 tall
  // depending on the build. The drone's own ink starts 2px above its box, at
  // 15 — so the head was inside the drone by 4 to 6 pixels on every duck in the
  // game. The box cannot move, so the ART does: 6 lifts the ink to 21 and gets
  // the shorter sliders out from under it entirely.
  //
  // SIX AND NOT EIGHT. Half of that argument used to be the top of a column:
  // eight put the top rung's ink at 61 against the 57 apex that was supposed to
  // clear the stack, so the one jump the column was designed around passed
  // through the drone it had just beaten. Nothing clears the column any more
  // (DRONE_COLUMN_ALTS), so that half is settled by the rung count instead and
  // six now rests on the duck alone — which is the half that happens every
  // single time. A standing hero draws 26 to 31 tall against ink at 21,
  // so failing to duck still visibly runs into the thing that hits you — which
  // is the test artLift's own note in game/draw.js sets for itself.
  //
  // ONE of these is a duck a hero may decline: the box tops out at alt+h = 20
  // and the shortest jump in the cast clears 51. A beat cabinet's duck slot can
  // stack four of them into a ceiling no jump in the game reaches — see
  // DRONE_COLUMN_ALTS below for the altitudes and the arithmetic behind them.
  drone:      { w: 12, h: 7,  sprite: 'drone', alt: 13, artLift: 6, armored: true, action: 'duck', bob: true, airDrift: { amp: 4, speed: 0.72 }, skins: ['drone', 'droneEye'] },
  // Buzzbirds use the shared gentle vertical hover, plus a modest world-space
  // approach toward the player. There is no independent side-to-side wobble.
  buzzbird:   { w: 12, h: 7,  sprite: 'buzzbird', alt: 34, armored: false, action: 'none', bob: true, airVx: -28 },
  shooterDrone: { w: 12, h: 7, sprite: 'drone', alt: 44, armored: true, action: 'none', shoots: true, bob: true, airDrift: { amp: 5, speed: 0.62 } },
  target:     { w: 12, h: 11,  sprite: 'capStar', alt: 40, breakable: true, action: 'none', isTarget: true, bob: true },
  icicle:     { w: 8, h: 8,   sprite: 'icicle', alt: 70, falls: true, action: 'jump', telegraph: 0.7 },
  qcrate:     { w: 12, h: 11, sprite: 'crate', alt: 40, breakable: true, action: 'none', bonusCoins: 3, isTarget: true, qbox: true, prizeChance: 0.25 },
  pipe:       { w: 14, h: 18, artH: 24, sprite: 'crate', ground: true, breakable: false, action: 'jump', tall: true },
  gap:        { w: 56, h: 20, sprite: null, ground: true, isGap: true, action: 'jump' },
  // A HINT, not an obstacle. Placed by the run rather than by a cabinet's
  // pattern list (see RunState.signPits): it appears in front of a pit only
  // once the player has gone into two of them, and it is the only entity in
  // the game that exists because of something the player DID.
  //
  // `action: 'none'` is the literal truth and it matters twice over — the
  // fairness sim budgets reaction time for things that have to be avoided, and
  // this does not have to be avoided by anybody. Running into it breaks it and
  // costs nothing (see the `sign` branch in RunState.collide); the point is
  // that the hint gets out of the way of the jump it is asking for.
  jumpSign:   { w: 13, h: 9, sprite: 'jumpSign', ground: true, breakable: true, action: 'none', sign: true },
  // The jump sign's sibling, pointing the other way: an arrow at the floor,
  // planted at the lip of a crypt tunnel mouth by spawnRouteEntries. The
  // darkness cabinet is the one place a hole can honestly be missed — the
  // light radius reaches the lip about when the decision is due — so its
  // mouths are signed proactively rather than earned by falling (the jump
  // sign's rule). Same contract otherwise: `action: 'none'`, breaks on
  // contact for nothing, and going THROUGH it is the intended move, since
  // through the sign is into the tunnel.
  downSign:   { w: 13, h: 9, sprite: 'downSign', ground: true, breakable: true, action: 'none', sign: true },
  // BEWARE OF DOG. The third sign, and the only one that warns about a hazard
  // rather than about the floor: planted a couple of screens short of the tape
  // on the stages that drew a finish dog (RunState.spawnDogSign), so the
  // encounter is announced before it is seen. Same box and same `sign`
  // contract as its two siblings — running through it breaks it and costs
  // nothing, because a warning that can hurt you is a trap.
  dogSign:    { w: 13, h: 9, sprite: 'dogSign', ground: true, breakable: true, action: 'none', sign: true },
  boostPad:   { w: 14, h: 4,  sprite: 'boostPad', ground: true, isBoost: true, action: 'none' },
  // The boost pad's vertical cousin. Same contract — run over it and it pays
  // out, jump it and it does not — pointed up instead of forward, because what
  // it buys is a road you cannot otherwise reach. `action: 'none'` is the
  // literal truth: nothing about it has to be avoided, and jumping it is a
  // choice rather than a save.
  springPad:  { w: 16, h: 6,  sprite: 'springPad', ground: true, isSpring: true, action: 'none' },
  // The pad at the foot of a loop-de-loop, and — because the ring is drawn from
  // it — the loop itself. One entity rather than two: the ring has no box, no
  // contact and no state of its own, so a second entity would be an object that
  // exists only to be drawn somewhere relative to the first one.
  //
  // Same contract as its two cousins, which is what makes all three learnable
  // as one thing: run over it and it pays out, jump it and it never sees you.
  // `action: 'none'` because a loop is not something to be avoided — sailing
  // over the pad costs you the ride and the coins on it, and nothing else.
  loopPad:    { w: 18, h: 4,  sprite: 'boostPad', ground: true, isLoop: true, action: 'none' },
  switch:     { w: 8, h: 8,   sprite: 'switch', alt: 46, breakable: true, action: 'none', isSwitch: true, bob: true },
  tombstone:  { w: 11, h: 8,  sprite: 'tombstone', ground: true, breakable: true, action: 'jump' },
  zombie:     { w: 10, h: 14, sprite: 'zombieWalk', ground: true, breakable: true, action: 'jump', vx: -14, shamble: true },
  beatBar:    { w: 8, h: 14,  sprite: null, ground: true, breakable: false, action: 'jump', beatSync: true },
  // THE CARD BOX — the beat cabinet's one prop you answer with the ability
  // button instead of with your feet, and the only entity in the game whose
  // destruction is QUANTIZED (see BOX_BURST_BEATS in game/beatchart.js).
  //
  // `beatShoot` is what marks it as a chart ability slot's physical half: the
  // BeatSpawner lays it BOX_LEAD_BEATS down the road from the beat the chart
  // asks the shot on, and a projectile that reaches it does not break it — it
  // lights the fuse, and the box goes on the beat. Shot on the one, gone on the
  // three, at every tempo and for every weapon in the cast, because the fuse is
  // measured in beats rather than in the flight time of whichever gun fired.
  //
  // `action: 'none'` AND `pushover: true`, and both halves matter. Half the
  // roster cannot shoot at all — the lane simply lays no box for them (see
  // heroShoots) — but a relay swap can land a non-shooter in front of one
  // already standing in the road, and the answer to that has to be that it
  // costs nothing. It is a cardboard box: you run through it, it comes apart,
  // you keep going. The same contract the JUMP sign has carried since it was
  // added, for the same reason — the lane put it there uninvited.
  //
  // 12x11, the crate's box exactly. It stands where a crate stands and it is
  // the same size as a crate, so the ONLY thing separating "jump this" from
  // "shoot this" is the paint (see the cardBox painter: pink target ring, in
  // the beat lane's own colour and the ribbon's own ability glyph).
  cardBox:    { w: 12, h: 11, sprite: 'crate', ground: true, breakable: true, action: 'none', beatShoot: true, pushover: true },
  cardboardMonster: { w: 12, h: 9, sprite: 'cardboardMonster', ground: true, breakable: true, action: 'jump' },
  chair:      { w: 12, h: 10, sprite: 'chair', ground: true, breakable: true, action: 'jump', vx: -34, roll: true },
  printer:    { w: 12, h: 7,  sprite: 'printer', ground: true, breakable: true, action: 'jump', shoots: true, isTarget: true },
  paperwork:  { w: 8, h: 6,   sprite: null, alt: 13, armored: false, action: 'duck', paper: true, bob: true, airDrift: { amp: 5, speed: 0.9 } },
  // `punt`: light enough that a boot sends it somewhere rather than through a
  // debris cloud. It stays `action: 'jump'` — jumping is still the answer the
  // spawner and the fairness sim budget for, and the punt is an ALTERNATIVE a
  // slide can take, never the required clear. Declaring it 'duck' would make it
  // the first ground-standing duckable in the game and would falsify the
  // "roll always clears duckables" shortcut in RunState.collide.
  //
  // `true` is the light arc. A heavier prop names its own — see barrel above.
  // `puntLabel` is what the juggle chain calls it on screen: the readout used
  // to say CONE because the cone was the only thing that could be kicked.
  trafficCone:{ w: 10, h: 13, sprite: 'trafficCone', ground: true, breakable: true, action: 'jump', punt: true, puntLabel: 'CONE' },
  // THE BANANA PEEL, straight out of a kart racer, and the only hazard in the
  // game whose answer is *only* the jump.
  //
  // `slip: true` is the whole of what makes it different. Every other ground
  // hazard has a second answer — a crate is plowed, a cone is punted, a cactus
  // is shot or rolled past by Fernwick — and the peel has none of them:
  //
  //   `breakable: false`  no weapon, stomp, roll or shockwave removes it. It is
  //     a floppy bag of fruit skin: there is nothing in it to break, and no
  //     debris entry either, so it has no scatter to give. Making it breakable
  //     would have put the game's one jump-only hazard back in the pile that
  //     half the cast shoots from a distance.
  //   not puntable        a boot going in low meets the floor, not the prop.
  //   not duckable        `action: 'jump'`, and sliding into it still slips —
  //     which is deliberate: it is the one hazard that punishes the slide, so
  //     holding duck through a row of cones stops being free.
  //
  // What it costs is a battery cell like anything else, plus the slip itself:
  // his feet go out, he is slowed and he cannot jump for a beat (RunState.slip).
  // The slide-whistle gag is the point — this is a pratfall, not a wound.
  //
  // 10x6 — SIXTY PER CENT of the size it was, measured against the hero rather
  // than against the other props. At 16x10 the peel was two thirds of Lorenzo's
  // height and read as furniture he had to get over; a dropped banana skin is a
  // small thing on a big road, and the joke only works if it looks like one.
  //
  // Wider than tall throughout, because the peel LIES on the road with one skin
  // risen out of it carrying the stalk: the width is the pile, the height is
  // that one arc. Earlier passes went 12x5 (flat, and unreadable — five pixels
  // is no silhouette, and a hazard with no silhouette is scenery) and then 14x12
  // (the kart item standing on its base, which read and still looked wrong).
  // Well under `worstJumpApex`, so the whole cast clears it in one jump.
  bananaPeel: { w: 10, h: 6, sprite: 'bananaPeel', ground: true, breakable: false, action: 'jump', slip: true },

  // --- STANDING HAZARDS ------------------------------------------------
  // Five props out of the gallery's hazard bake-off, chosen off that sheet.
  // What they have in common is what the sheet was testing: they do not
  // approach, they do not telegraph, and they are dangerous in every frame.
  // The lane already owned things that roll at you (barrel, chair, zombie) and
  // things that fall on you (icicle); it owned almost nothing that is simply
  // THERE and has to be read off its silhouette on the approach.
  //
  // NONE of them is puntable. `punt` is opt-in — see trafficCone — so leaving
  // it off is the whole of "not kickable": a boot going in low meets a spike
  // plate, a fire or a spinning blade, and the honest outcome of that is not a
  // prop sailing over the hero's head.
  //
  // Three of them are not breakable either. A fire and a saw have nothing in
  // them to break, and a spike plate is the floor. `breakable: false` also
  // means no debris entry is needed, and the peel's note above spells out the
  // rest of what the flag turns off: no weapon, stomp, roll or shockwave.
  //
  // Every box is the SOLID part only. The flame over a barrel, the flame over a
  // brazier's bowl and the teeth over a spike plate are all art bought upward
  // through PROP_TALL, and none of it can hit you — the same direction of slack
  // every hazard in this file already errs in.

  // A trap plate that never fully retracts (see the painter): the spikes ride
  // between two thirds and full extension, so the mechanism reads as live while
  // the box stays true. A retracting version would be a timing puzzle, and
  // `action: 'jump'` has no way to say "dangerous only sometimes".
  //
  // `bedded`: the art has no foot — the painter runs the plate past the bottom
  // of the box so the ground line cuts it — and the renderer drops the contact
  // ellipse under it. The two floor plates are the only things in the lane that
  // claim to be part of the road, and an oval shadow around one is the mark
  // that gives it away.
  popSpikes:  { w: 15, h: 7,  sprite: 'popSpikes', ground: true, breakable: false, action: 'jump', bedded: true },
  // Low and wide, and the second-flattest hazard in the game after the peel.
  campfire:   { w: 14, h: 10, sprite: 'campfire', ground: true, breakable: false, action: 'jump' },
  // SHOOTABLE, not kickable. Same 13x13 box as the wooden barrel it stands
  // beside, so a player who has learned one jump has learned both — the
  // difference is that the wooden one rolls at you and can be booted, and this
  // one stands still and can only be shot or smashed through.
  fireBarrel: { w: 13, h: 13, sprite: 'fireBarrel', ground: true, breakable: true, action: 'jump' },
  // SHOOTABLE, not kickable. Crypt's mechanic is DARKNESS, so this is the one
  // hazard in the game that is also a light source: it is worth having in the
  // lane for what it shows you as much as for what it costs you.
  brazier:    { w: 12, h: 14, sprite: 'brazier', ground: true, breakable: true, action: 'jump' },
  // The floor blade. Not breakable and not puntable for the obvious reason.
  floorSaw:   { w: 15, h: 8,  sprite: 'floorSaw', ground: true, breakable: false, action: 'jump', bedded: true },
  // The razor hurdle (legacy id `boomBarrier`): a short, ground-standing jump.
  // Its full two-post silhouette is now the box — no harmless art-only legs and
  // no airborne duck strip. Nine pixels keeps it decisively below crates and
  // barrels while still requiring a real hop. `armored` so pellets spark off
  // the rail; `breakable: false` because jumping is the only answer.
  boomBarrier: { w: 16, h: 9, sprite: 'boomBarrier', ground: true, armored: true, breakable: false, action: 'jump', splitFeet: true },

  // --- the animal hazards (art: sprites/animals.js) -------------------------
  // The only ground hazards that CLOSE on the hero rather than waiting for him.
  // `vx` is world-space and negative is toward him, so the closing speed is the
  // run's own scroll plus this — which is why none of them is set anywhere near
  // the zombie's shamble (-14) and none is set fast enough to eat the reaction
  // runway the spawner guarantees. Speed is the whole characterisation: the
  // bruiser is the one you can out-think, the cat is the one you cannot.
  //
  // Keys match the painter names in sprites/animals.js on purpose — drawWorldEntity
  // resolves art off the entity TYPE first (hasProp(e.type)), so naming them the
  // same is what wires the animation up with no draw-path change at all.
  // `animal` is the one thing about these that no other flag says. Everything
  // else in the registry is legible from what it DOES — isGap, shoots, falls,
  // punt — but a dog is a dog by being a dog, and the level editor groups its
  // palette off these flags rather than off a list it would have to be told to
  // update. A new animal declares it here and turns up there.
  dogSnarler: { w: 16, h: 11, sprite: 'dogSnarler', ground: true, breakable: true, action: 'jump', vx: -62, animal: true },
  dogBruiser: { w: 15, h: 10, sprite: 'dogBruiser', ground: true, breakable: true, action: 'jump', vx: -38, animal: true },
  dogFeral:   { w: 17, h: 12, sprite: 'dogFeral', ground: true, breakable: true, action: 'jump', vx: -68, animal: true },
  catFury:    { w: 11, h: 9,  sprite: 'catFury', ground: true, breakable: true, action: 'jump', vx: -78, animal: true },

  // The finish-line dog. Scripted, never dealt from a pattern bag — see
  // RunState.spawnFinishDog: on plumber stages one dog holds the tape, appears
  // barking once the finish pole is in view and charges the hero right-to-left,
  // off the screen's left edge. `breakable: false` is the whole of "cannot be
  // killed" — no weapon, kick, stomp, roll or shockwave (the peel's note above
  // spells out everything the flag turns off) — so the jump is the only answer,
  // which is what `action: 'jump'` declares. Not puntable either: punt is
  // opt-in, and a boot going in low meets a dog that has decided about you.
  // `skins` wears one of the three dog rigs — through the finish* aliases in
  // sprites/props.js, which are the same painters at a higher raster detail —
  // picked off the spawn position as every skin is, so which dog guards a
  // stage is stable and identical on a replay. No debris entry — nothing here
  // ever breaks.
  //
  // 22x15: about 1.4x the pack dogs, and the biggest ground hazard box in the
  // game — the art scales with the box, so it also DRAWS at that stature. It
  // has a whole empty straight to itself and no company in its runway, which is
  // what buys a box this size without cheating the reaction budget; 15 is
  // still a third of the worst hero's jump apex, so the one required clear
  // stays comfortable for the entire cast.
  //
  // `vx` here is only a fallback: spawnFinishDog overrides it with a fraction
  // of the run's own scroll, so the charge reads equally fast on every stage
  // and the two-jump finish geometry (see that method) holds at every speed.
  finishDog:  { w: 22, h: 15, sprite: 'dogSnarler', ground: true, breakable: false, action: 'jump', vx: -70, animal: true, skins: ['finishSnarler', 'finishBruiser', 'finishFeral'] },
};

// What a thing is made of, for when it stops being a thing. Colours are pulled
// from each prop painter so the chunks read as pieces of the sprite that just
// left; `mat` picks the timbre of the scatter they make when they land.
export const DEBRIS = {
  cactus:      { colors: ['#a83020', '#d84828', '#f8d0a0'], size: 2.6, mat: 'soft' },
  cactusBig:   { colors: ['#a83020', '#d84828', '#f8d0a0'], size: 3.2, count: 14, mat: 'soft' },
  snowman:     { colors: ['#eaf6ff', '#b9d9ee', '#d84848'], size: 2.6, mat: 'soft' },
  snowmanBig:  { colors: ['#eaf6ff', '#b9d9ee', '#d84848'], size: 3.2, count: 14, mat: 'soft' },
  crate:       { colors: ['#c89858', '#8a6432', '#5a4020'], size: 3, mat: 'wood' },
  qcrate:      { colors: ['#f6d33c', '#c89858', '#8a6432'], size: 3, mat: 'gold' },
  barrel:      { colors: ['#b07840', '#7a4c22', '#d09858'], size: 3.2, mat: 'wood' },
  tombstone:   { colors: ['#9a9ab0', '#6a6a80'], size: 3, mat: 'stone' },
  // Board and post: the sign's own two colours plus the ink of the lettering.
  jumpSign:    { colors: ['#f2c53c', '#7a5230', '#2a1e0e'], size: 2.6, mat: 'wood' },
  downSign:    { colors: ['#f2c53c', '#7a5230', '#2a1e0e'], size: 2.6, mat: 'wood' },
  // The red board, its post, and the pale panel the dog's head sits on.
  dogSign:     { colors: ['#d83828', '#7a5230', '#f6e4c8'], size: 2.6, mat: 'wood' },
  cardboardMonster: { colors: ['#c8a068', '#8a6a3a', '#fff'], size: 3, mat: 'soft' },
  // Card and packing tape, plus the pink of the target ring — the box comes
  // apart into the three things it is painted out of.
  cardBox:     { colors: ['#c8a068', '#8a6a3a', '#f890b8'], size: 2.8, mat: 'soft' },
  chair:       { colors: ['#4a5a6c', '#3a4a5a', '#2a3542'], size: 2.8, mat: 'wood' },
  printer:     { colors: ['#b0b0c0', '#fff', '#48e0c8'], size: 2.6, mat: 'metal' },
  zombie:      { colors: ['#9ec89e', '#5a6a8a', '#4a6a4a'], size: 2.4, count: 12, mat: 'soft' },
  drone:       { colors: ['#8858c8', '#5a3890', '#c8b8e8'], size: 2.4, spark: '#f6d33c', mat: 'metal' },
  shooterDrone:{ colors: ['#8858c8', '#5a3890', '#e04848'], size: 2.4, spark: '#f6d33c', mat: 'metal' },
  buzzbird:    { colors: ['#f0a860', '#d87830', '#f6d33c'], size: 2.2, grav: 190, mat: 'soft' },
  icicle:      { colors: ['#b8e0f8', '#fff', '#8ab8d8'], size: 2.6, mat: 'stone' },
  target:      { colors: ['#f6d33c', '#fff8d0'], size: 3, mat: 'metal' },
  switch:      { colors: ['#48e0c8', '#f6d33c', '#3a4a5a'], size: 2.4, mat: 'metal' },
  paperwork:   { colors: ['#fff', '#e8e8f0'], size: 3, grav: 60, count: 10, mat: 'soft' },
  trafficCone: { colors: ['#e86020', '#f8a030', '#fff'], size: 2.8, mat: 'soft' },
  // The two shootable standing hazards. Both scatter METAL — a drum band and a
  // brazier bowl are the parts with mass — with an ember colour in the mix and
  // a spark, so a shot that opens one throws fire as well as scrap.
  fireBarrel:  { colors: ['#a4603a', '#7c4526', '#ffb02e'], size: 3, spark: '#ffef9e', mat: 'metal' },
  brazier:     { colors: ['#4d4038', '#6a5a4c', '#ff8a2c'], size: 2.8, spark: '#ffef9e', mat: 'metal' },
  // Coat, shadow and the one bright note each animal carries — the tan points,
  // the pale belly, a tooth. Pulled from the palettes in sprites/animals.js so
  // the scatter reads as pieces of the thing that just left.
  dogSnarler: { colors: ['#3a3446', '#26212f', '#b07840'], size: 2.4, count: 12, mat: 'soft' },
  dogBruiser: { colors: ['#c08a4a', '#95622f', '#ecd6b2'], size: 2.8, count: 12, mat: 'soft' },
  dogFeral:   { colors: ['#6a6a74', '#45454f', '#a09a94'], size: 2.4, count: 13, mat: 'soft' },
  catFury:    { colors: ['#332f3f', '#201d2a', '#8a86a0'], size: 2.2, count: 10, mat: 'soft' },
};

export const DEBRIS_DEFAULT = { colors: ['#c8a068', '#8a6432'], size: 2.8, mat: 'wood' };

export const PICKUPS = {
  coin:      { w: 8, h: 8, sprite: 'coin', score: 50, coin: true },
  battery:   { w: 8, h: 8, sprite: 'battery', heal: 1 },
  capShield: { w: 8, h: 8, sprite: 'capShield', power: 'shield' },
  capMagnet: { w: 8, h: 8, sprite: 'capMagnet', power: 'magnet' },
  capStar:   { w: 8, h: 8, sprite: 'capStar', power: 'star' },
  capAirJump:{ w: 8, h: 8, sprite: 'capAirJump', power: 'airjump' },
  capSpeed:  { w: 8, h: 8, sprite: 'capSpeed', power: 'speed' },
  capLowGrav:{ w: 8, h: 8, sprite: 'capLowGrav', power: 'lowgrav' },
  capUnpeel: { w: 8, h: 8, sprite: 'capUnpeel', power: 'unpeel' },
  // Arms one banked 3-second rewind — the touch player's only rewind, and a
  // one-shot beside the free hold-Left scrub on desktop.
  // See docs/mobile-rewind-powerup.md.
  capRewind: { w: 8, h: 8, sprite: 'capRewind', power: 'rewind' },
  appliance: { w: 22, h: 18, sprite: 'appliance', appliance: true, bob: true },
  cord:      { w: 14, h: 9, sprite: 'cord', cord: true },
  resident:  { w: 10, h: 12, sprite: 'resident', resident: true, shamble: true },
};

let idCounter = 1;

export function makeObstacle(type, worldX, opts = {}) {
  const def = OBSTACLES[type];
  const n = opts.n || 1;
  return {
    id: idCounter++, kind: 'obstacle', type, def,
    x: worldX,
    alt: def.ground ? 0 : (def.alt || 12),
    w: def.w, h: def.h * (def.stack ? n : 1),
    n, vx: def.vx || 0,
    live: true, broken: false,
    fallT: def.falls ? (def.telegraph || 0.7) : 0, fell: !def.falls,
    shootT: def.shoots ? 1.2 : 0,
    hp: opts.hp || 1,
    bobPhase: (worldX * 0.05) % (Math.PI * 2),
    gait: (worldX * 0.11) % (Math.PI * 2), // shamblers step out of lockstep with each other
    // Which body this instance wears, when its type has more than one. Purely
    // cosmetic — same box, same behaviour, same debris — so a row of drones is a
    // mixed patrol instead of one sticker repeated. Derived from the spawn
    // position exactly as bobPhase is, so it is stable per instance and
    // identical on a replay rather than rolled from a live RNG.
    skin: def.skins ? def.skins[Math.abs(Math.round(worldX * 0.13)) % def.skins.length] : null,
    // How far the ART rides above the box, if the type asks for any. Copied onto
    // the instance rather than read off the def at paint time because it is a
    // per-entity number in draw.js — a set piece may want to lift one body
    // without lifting the type.
    artLift: def.artLift || 0,
    // Initialized by the first update so a newly spawned flyer does not jump
    // sideways when its drift clock is first evaluated.
    driftOriginX: def.airDrift ? null : undefined,
  };
}

// THE DRONE COLUMN'S RUNGS — the altitude of each body's underside, bottom
// first. A beat cabinet's duck slot may lay this instead of a lone drone (see
// `column` in game/beatchart.js), and it exists because a lone drone was never
// really a duck at all: its box tops out at 20, the shortest jump in the cast
// reaches 51, and so every hero in the game could answer a duck beat with the
// jump button and the slot asked nothing of anybody.
//
// WHERE THE TOP OF THE COLUMN LANDS IS THE WHOLE POINT, and it is 65.
// Apex, as feet-height above the ground, is jumpMult x 57 (player.js jumpV):
// 51 for B-33P at x0.90, 57 for a plain x1.00 — Grumpos included, now that
// `heavy` is paid for in airtime rather than height — 59, 60, 61 for Ray M'n,
// Gnash and Lorenzo, and 63 at Clara's x1.10.
//
// THREE RUNGS USED TO BE THE GATE AND CANNOT BE ANY MORE. At a top of 50 it
// split the cast: B-33P and Grumpos both apexed at 46 and had to duck, everyone
// else at 57-and-up could take it with the jump button, and 50 sat in an 11px
// gap with margin on both sides. Compressing the jump band closed that gap.
// The cast now runs 51 to 63 with no space in it wider than 6px, so any ceiling
// that splits the roster splits it on two or three pixels — the coin-flip the
// old note was written to avoid. There is no honest middle left.
//
// So the column stops asking, and the middle height goes away with it — a
// three-rung stack now tops out at 52 against B-33P's 51, a wall for one hero
// by less than a pixel, so validateBeatChart refuses to let a chart ask for it.
// A FOURTH rung at a 16px pitch tops out at 68,
// clear of every jump in the game in the same direction and by 5px at the
// closest — Clara's 63 — which is the margin the old 50 held against the hero
// below it. A duck slot is a duck, for the whole cast, and the decision it asks
// for is timing rather than roster. Kiko's second jump still clears anything,
// and is still supposed to.
//
// SIXTEEN AND NOT FIFTEEN is the price of that margin, and it is paid in the
// seam. A drone draws 12.6px tall and bottom-anchored (7 x 4/3 x
// PROP_VISUAL_SCALE), so the pitch that used to show 2.4px of sky between
// bodies now shows 3.4px. Still a seam rather than a gap, and still one
// machine; a fourth rung at the old pitch topped out at 65, which is inside
// 3px of Clara's apex, and this file does not put a decision on 3px.
//
// The hero is only over the 12px column for about a tenth of a second at this
// cabinet's speed, which costs roughly 1px off the apex — so the apex really
// is the clearance and the table above can be read straight off.
//
// AND THE GAPS ARE NOT DOORS. An airborne hero is 14 tall, always: jumpPressed
// clears `ducking`, and the airborne branch blends duckAmount back to zero, so
// Down in mid-air is a slide-slam that falls faster without shrinking the box
// (game/player.js). Nothing in the cast can be threaded through 9px of air.
// The gaps are here to buy the height with four bodies instead of nine, and
// the art closes most of them anyway — see the pitch note above for the 3.4px
// of sky that is left and why it reads as one machine rather than as four with
// room between them.
export const DRONE_COLUMN_ALTS = Object.freeze([13, 29, 45, 61]);

/**
 * A stack of drones at one world X — four boxes rather than one tall one, so
 * the hitboxes stay honest through the gaps instead of claiming the air.
 *
 * The shared X is doing real work. `bobPhase`, the drift clock and `skin` are
 * all derived from it, so the column bobs and drifts as one rigid thing and
 * wears a single body instead of turning into a mixed patrol stacked on top of
 * itself.
 *
 * The bottom rung keeps the def's own altitude, and must: that is the duck
 * contract the spawner refuses to let a pattern move (see the altitude note in
 * game/spawner.js), the underside has to sit where a slide clears it and a
 * stand does not, and it is the only rung a running hero ever meets. The three
 * above it exist for the jumper alone.
 *
 * TWO RUNGS IS NOT A GATE AND IS NOT MEANT TO BE. A pair tops out at 36 and the
 * worst jump in the cast reaches 51, so it is a column that can still be
 * declined — which is the right shape for the first one a player meets, where
 * being wrong should cost a beat rather than the run. Only the full four
 * reaches 68 and takes the jump away. Three is refused upstream
 * (validateBeatChart): 52 against B-33P's 51 is a wall for one hero by less
 * than a pixel, which is not a height anybody should be able to author.
 */
export function makeDroneColumn(worldX, rungs = DRONE_COLUMN_ALTS.length) {
  return DRONE_COLUMN_ALTS.slice(0, rungs).map((alt, i) => {
    const ob = makeObstacle('drone', worldX);
    ob.alt = alt;
    // Which rung this is, and the only thing anything downstream asks about it:
    // the lane shadow under a flyer is drawn per entity, and three of them at
    // one X stacked three coats of the same smear into a black bar. Rung 0
    // marks the lane for the whole column.
    ob.columnRung = i;
    return ob;
  });
}

export function makePickup(type, worldX, alt) {
  const def = PICKUPS[type];
  return {
    id: idCounter++, kind: 'pickup', type, def,
    x: worldX, alt: alt ?? 8, w: def.w, h: def.h,
    live: true, vx: 0, vy: 0, magnetized: false,
    bobPhase: (worldX * 0.07) % (Math.PI * 2),
  };
}

// AABB in world space. Entities measured from ground: box bottom = ground - alt.
export function entityBox(e, groundY) {
  const bottom = groundY - e.alt;
  return { x: e.x, y: bottom - e.h, w: e.w, h: e.h };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
