// Fake AAA end-credits crawl. Dev-menu only for now (see 'CREDITS' under
// SCENES in src/dev/menus.js) — there is no production route to it yet.
// CREDITS.md at the repo root is the prose original; this is the shipped cut of
// it. The two carry the same roles, names and jokes, but not the same
// presentation — the screen drops the markdown's screenplay-style handoff
// headings in favour of drawing the handoff, and adds art rows the document has
// no way to express. Nothing here parses that file; keep the two in step by
// hand when the wording changes.
import { W, H, screen } from '../engine/renderer.js';
import { Rng } from '../engine/rng.js';
import { Input } from '../engine/input.js';
import { Audio, PORTAL_RELAY_CREDITS, portalCueFlashAt } from '../engine/audio.js';
import { drawText, drawTextCentered, textWidth, textYForMid, wrapText, UI_PLATE } from '../engine/sprites.js';
import { drawToon, drawToonFace } from '../sprites/toons.js';
import { drawProp } from '../sprites/props.js';
import { readPlatform } from '../engine/platform.js';
import { drawHandoff, handoffRunLeft, HANDOFF_SWAP_AT, HANDOFF_LINE_A_AT, HANDOFF_LINE_B_AT } from './credits-handoff.js';
import { MEGAMIX_THEME } from '../data/megamix.js';

const GOLD = '#f6d33c';
const CYAN = '#48e0c8';
const PINK = '#f890b8';
// Was #5a5a68, which is barely four steps off the #0b0b14 background — it read
// as "greyed out" rather than "quiet", and putting a lit starfield behind it
// only narrowed the gap. This still sits clearly below FG in the hierarchy
// while actually being readable, on a phone and over a star.
const DIM = '#98a0b8';
const FG = '#c8c8d8';
const WHITE = '#ffffff';

const CX = W / 2;
// Hardcoded, not read from the clock. A copyright line states the year of the
// work, not the year the player happens to be sitting in — deriving it from
// Date would silently relabel the game every January.
const CREDITS_YEAR = 2026;
const BODY_W = W - 64;
// Slow enough to read a role/name pair per second, fast enough that the whole
// joke doesn't outstay the track it's borrowed. SKIP is always one tap away.
const SCROLL_SPEED = 30;
// Guards the same confirm/tap press that opened this screen from the dev menu
// from also being read as "skip" on the first frame.
// The relay swoosh, under the megamix rather than over it: this is one credit block
// handing over to the next, which is the same gesture a hero tag is, but it is scenery
// here and an event there. 3.5dB under the in-game firing (PORTAL_RELAY_GAIN 9).
//
// Levelled by RMS against what it is being kept under, not by the multiplier: a longer
// swoosh sustains for more of its own length, so the same number measures hotter the
// more it is stretched.
const CREDITS_SWAP_GAIN = 2.9;

const OPEN_GUARD_T = 0.3;

// Portrait column for the STARRING block. Fixed x rather than hung off the end
// of the role text, which varies by 100+ units across the cast and would leave
// the faces in a ragged line down the left.
// 92 rather than hard against the margin: at 26 the portraits sat ~100u clear
// of even the longest role line, which is a fifth of the screen of dead space
// between a face and the name it belongs to.
const FACE_X = 92;
const FACE_BOX = 18;
// Where a 0.85-scale row's ink sits relative to the y drawText is given, so art
// centres on the lettering instead of on its glyph box.
const ROW_INK_MID = 5;
// How much a held arrow adds to / removes from the 1x scroll rate.
const SCRUB_RATE = 7;
// The corner legends, parked on the bottom edge. A 0.6 line is ~7u of ink, so
// this leaves roughly two units of air under it.
const HINT_SCALE = 0.6;
const HINT_Y = H - 9;
// Watchdog for a scrub action that never gets released. Generous on purpose:
// a full-speed scrub crosses the entire crawl in about twenty seconds, so
// nothing a real finger does comes near this.
const SCRUB_STUCK_T = 40;
// Where the final row comes to rest. The crawl does NOT scroll away into an
// empty screen and does NOT eject you: it settles on the closing socket /
// sequel card and holds there, music still running, until you leave.
// Where the LAST row (the copyright) comes to rest, in screen units. Lowered
// from 200: the crawl now travels a little further before it stops, which sits
// the closing card higher and leaves the bottom margin to the corner legends
// rather than crowding them. The gap above the socket is what actually clears
// the release line off the top — see the note on it in SCRIPT.
const REST_Y = 188;
// How far the two heroes in a relay stand either side of the portal. The
// dialogue lines are centred on these same offsets so each line sits under the
// character saying it — with the speaker prefixes gone, position and colour are
// the only things left carrying attribution.
const HANDOFF_DX = 44;
const HANDOFF_H = 48;
// Half the clear space the exchange leaves down the middle. The portal above
// is 22u wide, so this keeps the gap a little wider than the thing it is a gap
// for — the two halves must never look like one wrapped sentence. 14 leaves 28
// down the middle, which is still wider than the portal and about as tight as
// that rule allows.
//
// Held to ONE number for both halves on purpose. Measured off the rendered ink
// rather than the layout, an 18 here put each line 18.13u from the portal's
// centre and 8.50u clear of its drawn edge — the same on both sides, on all
// four hand-offs. So when the reply reads as sitting further out than the line
// it answers, that is its length talking and not its position: it is four times
// the lettering, and its weight carries away to the right. The fix for that is
// to bring the WHOLE exchange in, which is this; giving the reply its own
// smaller gap would buy the look by making the composition genuinely lopsided.
const HANDOFF_GAP = 14;
const OUTGOING_INK = '#48e0c8';
const INCOMING_INK = '#f6d33c';
// A line does not just belong to its speaker, it travels with them: each half
// of the exchange is dragged along by the hero saying it and comes to rest in
// the tuned slot above, so the words arrive with the runner instead of being
// captioned under an empty stage.
//
// How far the outgoing line trails its speaker at the start of their run. NOT
// the hero's own displacement — they cross ~290u in under two seconds, and text
// moving at a sprint is text nobody reads. This is a sympathetic drag at roughly
// a tenth of their speed: enough that the words are plainly travelling with the
// runner, slow enough to read while they do. A line only ever trails BEHIND its
// resting slot and never past it, so the settled composition is exactly what it
// always was. (The reply's trail is not this — it is measured off the portal;
// see 'handoffDuo' below.)
const HANDOFF_LINE_CARRY = 34;

// ---- the sky ---------------------------------------------------------------
// Modelled on the ARCADE ART GALLERY visualizer's night sky (its `galleryStars`
// recipe: depth-weighted radius, per-star twinkle rate, additive blend) but
// owned here rather than shared. That painter is a method bound to a live
// visualizer's audio-derived palette and clock, so reusing it literally would
// have meant refactoring a shipped visualizer's look to serve a dev-only
// screen. Same recipe, no risk to it.
const STAR_COUNT = 150;
// Fixed seed: the sky is the same every time the credits roll, so a screenshot
// of it is reproducible and the layout can be judged against a known field.
const STAR_SEED = 'mashenstein-credits-sky';
const STAR_INKS = ['#ffffff', '#c8d4ff', '#f6d33c', '#48e0c8', '#f890b8'];
// How far the field drifts against the crawl. Depth 1 stars travel ~1 screen
// over the whole roll — enough to feel like the credits are moving through
// something, far too slow to pull the eye off the names.
const STAR_PARALLAX = 0.06;

const alphaCache = new Map();
function withAlpha(hex, a) {
  const key = hex + '|' + a.toFixed(3);
  let v = alphaCache.get(key);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
    alphaCache.set(key, v);
  }
  return v;
}

function makeStars(n) {
  const rng = new Rng(STAR_SEED);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: rng.float() * W,
      y: rng.float() * H,
      r: 0.28 + rng.float() * 1.25,
      phase: rng.float() * Math.PI * 2,
      rate: 0.45 + rng.float() * 1.8,
      ink: STAR_INKS[Math.floor(rng.float() * STAR_INKS.length)],
      depth: 0.25 + rng.float() * 0.75,
    });
  }
  return out;
}

// A comet instead of planets. A planet is a permanent object: parked in the
// frame for the whole roll, drifting on the parallax, and therefore passing
// behind every band of the crawl sooner or later. A comet is an event — it
// crosses, it is gone, and the sky is a sky again — so the field keeps its
// depth without anything competing with the names for more than a few seconds.
//
// One slot every COMET_CYCLE seconds, and most slots stay empty, so a roll of
// a few minutes gets a handful: enough that the sky is alive, rare enough that
// catching one feels like catching one.
const COMET_CYCLE = 17;
const COMET_CHANCE = 0.6;
const COMET_TRAVEL = 2.4;

// Deterministic per slot, like the seeded star field above it: the same roll
// draws the same comets at the same moments, so a screenshot is reproducible
// and a bad crossing can be found again. Sampled per frame, so it is a function
// of the slot rather than a seeded Rng carried across frames.
//
// An integer mixer rather than the usual fract(sin(n)*43758.5453): that one is
// built for the wide, noisy inputs a shader feeds it and is visibly lumpy over
// the first twenty integers — it drew 7 comets where 12 were asked for, with a
// hundred seconds of empty sky in the middle. `salt` separates the draws so a
// slot's chance, direction and height are independent of each other.
function hash01(n, salt = 0) {
  let x = Math.imul(n | 0, 374761393) + Math.imul(salt | 0, 668265263) + 1442695040;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function drawComet(ctx, t) {
  const slot = Math.floor(t / COMET_CYCLE);
  if (hash01(slot) > COMET_CHANCE) return;
  const phase = (t - slot * COMET_CYCLE) / COMET_TRAVEL;
  if (phase >= 1) return;
  const dir = hash01(slot, 1) < 0.5 ? 1 : -1;
  // Upper half only, on a shallow descent. Low and steep reads as a falling
  // object rather than a distant one, and lands it in the middle of the crawl.
  const y0 = 16 + hash01(slot, 2) * H * 0.42;
  const drop = 22 + hash01(slot, 3) * 46;
  const span = W + 100;
  const x = dir > 0 ? -50 + phase * span : W + 50 - phase * span;
  const y = y0 + phase * drop;
  // Long enough to read as a comet under the scrim. At 44u it was a scratch on
  // the lens; at ~70 the taper has room to be a tail.
  const len = 66 + hash01(slot, 4) * 32;
  // Fade in and out at the ends so it arrives and leaves rather than popping.
  const fade = Math.sin(phase * Math.PI);
  const tx = x - dir * len;
  const ty = y - drop * (len / span);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x, y, tx, ty);
  g.addColorStop(0, withAlpha('#ffffff', 0.9 * fade));
  g.addColorStop(0.28, withAlpha('#c8d4ff', 0.4 * fade));
  g.addColorStop(1, withAlpha('#c8d4ff', 0));
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  // A soft halo under the head, so the bright point has somewhere to sit — the
  // same trick the stars' additive blend plays, one size up.
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 5.5);
  halo.addColorStop(0, withAlpha('#ffffff', 0.5 * fade));
  halo.addColorStop(1, withAlpha('#c8d4ff', 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha('#ffffff', 0.95 * fade);
  ctx.beginPath();
  ctx.arc(x, y, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const wrapY = (v) => ((v % H) + H) % H;

function drawSky(ctx, stars, t, scroll, reduced) {
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);

  // The Monster Mix is playing over this screen, so the sky answers it. Bass
  // swells the nebulae, the beat flares the stars. musicAnalysis() is the same
  // allocation-free readout the jukebox visualizers use, and it degrades to a
  // deterministic fallback with no Web Audio at all.
  let pulse = 0, bass = 0;
  if (!reduced) {
    const a = Audio.musicAnalysis ? Audio.musicAnalysis() : null;
    if (a) { pulse = a.beatPulse || 0; bass = a.bass || 0; }
  }

  const neb = (cx, cy, r, ink, alpha) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, withAlpha(ink, alpha));
    g.addColorStop(1, withAlpha(ink, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  const drift = reduced ? 0 : Math.sin(t * 0.06) * 26;
  neb(120 + drift, wrapY(60 - scroll * 0.02), 190, '#3a2a6e', 0.30 + bass * 0.12);
  neb(370 - drift, wrapY(200 - scroll * 0.03), 210, '#123a58', 0.26 + bass * 0.10);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of stars) {
    const y = wrapY(s.y - scroll * s.depth * STAR_PARALLAX);
    const tw = reduced ? 0.8 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.rate + s.phase));
    const boost = 1 + pulse * 0.45 * s.depth;
    ctx.fillStyle = withAlpha(s.ink, Math.min(1, (0.16 + s.depth * 0.34) * tw * boost));
    ctx.beginPath();
    ctx.arc(s.x, y, s.r * (0.72 + tw * 0.45) * boost, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Motion is the whole point of a comet, so reduced motion simply gets none.
  if (!reduced) drawComet(ctx, t);

  // The scrim is what makes the crawl readable over all of the above. Without
  // it the brightest stars sit at the same value as DIM body text.
  ctx.fillStyle = 'rgba(5,6,15,0.34)';
  ctx.fillRect(0, 0, W, H);
}

// ---- safe area -------------------------------------------------------------
// The crawl is full-bleed: HUMAN RESOURCES is measured to span the real screen,
// not a fixed inset off the 480-unit design box. On a notched phone that box
// is not all reachable, so everything edge-anchored asks here instead.
const BLEED_PAD = 4;
function safeBox() {
  const left = Math.max(0, screen.safeLeft || 0);
  const right = Math.max(0, screen.safeRight || 0);
  const bottom = Math.max(0, screen.safeBottom || 0);
  const x0 = left + BLEED_PAD;
  const x1 = W - right - BLEED_PAD;
  return { x0, x1, width: Math.max(80, x1 - x0), cx: (x0 + x1) / 2, bottom };
}

// ---- content, declared top to bottom in the order it scrolls -------------
const SCRIPT = [
  { k: 'title', text: 'MASHENSTEIN: THE UNPLUGGENING' },
  { k: 'title2', text: 'END CREDITS' },
  { k: 'gap', px: 18 },
  { k: 'mark', prop: 'cord', w: 38, h: 23 },
  { k: 'gap', px: 6 },
  { k: 'sub', text: 'A CIRCUIT & SPLICE INTERACTIVE PRODUCTION', color: GOLD },
  { k: 'sub', text: 'IN ASSOCIATION WITH RECLAIMED PARTS STUDIOS' },
  { k: 'note', text: 'A division of General Appliance Holdings, Unincorporated' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'DIRECTION' },
  { k: 'role', role: 'Creative Director', name: 'Adrienne Castellan' },
  { k: 'role', role: 'Game Director', name: 'Marcus Oyelaran' },
  { k: 'role', role: 'Executive Producer', name: 'Priya Deshbandhu' },
  { k: 'role', role: 'Studio Head / General Manager', name: 'Walter Krebbs' },
  { k: 'gap', px: 14 },
  { k: 'handoff', a: 'DIRECTION', b: 'PRODUCTION', from: 'lorenzo', to: 'gnash', lineA: 'Your turn.', lineB: 'I have filed a form about that.' },
  { k: 'gap', px: 16 },

  { k: 'header', text: 'PRODUCTION' },
  { k: 'role', role: 'Lead Producer', name: 'Simone Achterberg' },
  { k: 'role', role: 'Associate Producer', name: 'Devon Iyer' },
  { k: 'role', role: 'Associate Producer', name: 'Bea Whitlock' },
  { k: 'role', role: 'Associate Producer', name: 'Toma Radu' },
  { k: 'role', role: 'Production Coordinator', name: 'Nkechi Obuya' },
  { k: 'role', role: 'Line Producer, Budget Cuts Division', name: 'Herb Yun (also responsible)' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'DESIGN' },
  { k: 'role', role: 'Design Director', name: 'Callum Reyes-Pratt' },
  { k: 'role', role: 'Lead Gameplay Designer', name: 'Odalys Ferreira' },
  { k: 'role', role: 'Relay & Portal Systems Design', name: 'Jonas Whitfield' },
  { k: 'role', role: 'Plugs Economy Design', name: 'Rosalind Achebe' },
  { k: 'role', role: 'Boss Encounter Design', name: 'Yusuf Okonkwo-Bright' },
  { k: 'role', role: 'Breaker-Box Minigame Design', name: 'Liesel Thorncombe' },
  { k: 'role', role: 'Difficulty & Fairness Design, Modes 1-4', name: 'Parminder Josh' },
  { k: 'role', role: 'Design Lead, Mode 5 (Against Recommendation)', name: 'Parminder Josh, again, reluctantly' },
  { k: 'gap', px: 10 },
  { k: 'sub', text: 'CABINET DESIGN', color: PINK },
  { k: 'role', role: 'PLUMBER PANIC', name: 'Ilse Novotny' },
  { k: 'role', role: 'SPEED ZONE', name: 'Trent Okafor' },
  { k: 'role', role: 'NEON BLASTERS', name: 'Priya Wexler' },
  { k: 'role', role: 'FROST FORTRESS', name: 'Gunnar Alstad' },
  { k: 'role', role: 'CRYPT SHIFT', name: 'Ekaterina Voss' },
  { k: 'role', role: 'RHYTHM BANKRUPTCY', name: 'Marlon deSouza' },
  { k: 'role', role: 'CARDBOARD KINGDOM', name: 'Rhiannon Oduya' },
  { k: 'role', role: 'CORPORATE KOMBAT', name: 'Felix Bramante' },
  { k: 'role', role: 'THE SURGE', name: 'The entire Design department, at once' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'NARRATIVE' },
  { k: 'role', role: 'Narrative Director', name: 'Esme Vantongeren' },
  { k: 'role', role: 'Lead Writer', name: 'Duncan Pella' },
  { k: 'role', role: 'Additional Writers', name: 'Femi Balogun, Katarzyna Wrobel' },
  { k: 'role', role: 'Dialogue & Hand-Off Barks', name: 'Soren Dalgetty' },
  { k: 'role', role: 'Grievance & Paperwork Copywriting', name: 'Marguerite Cho' },
  { k: 'gap', px: 14 },
  { k: 'handoff', a: 'NARRATIVE', b: 'ENGINEERING', from: 'fernwick', to: 'b33p', lineA: 'Your turn.', lineB: "We don't do turns. We do tickets." },
  { k: 'gap', px: 16 },

  { k: 'header', text: 'ENGINEERING' },
  { k: 'role', role: 'Technical Director', name: 'Radhika Sethna' },
  { k: 'role', role: 'Lead Engine Programmer', name: 'Otis Vandermeer' },
  { k: 'role', role: 'Principal Engineer, Core Systems', name: 'George Simonidis' },
  { k: 'role', role: 'Rendering & Style-Pack Programming', name: 'Ines Kowalczyk' },
  { k: 'role', role: 'Gameplay Systems Programming', name: 'Tobias Nkemelu' },
  { k: 'role', role: 'Local-Only Netcode (There Is No Netcode)', name: 'Department of One' },
  { k: 'role', role: 'UI/UX Engineering', name: 'Harriet Osei' },
  { k: 'role', role: 'Mobile Platform Engineering', name: 'Devraj Anand' },
  { k: 'role', role: 'Safari Fullscreen API Denial Liaison', name: 'Devraj Anand, still processing' },
  { k: 'role', role: 'Build Systems & Release Engineering', name: 'Petra Lindqvist' },
  { k: 'role', role: 'QA Automation & Fairness Simulation', name: 'Wendell Bracks' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'ART' },
  { k: 'role', role: 'Art Director', name: 'Ottoline Marsh' },
  { k: 'role', role: 'Character & Toon Art', name: 'Idris Vane' },
  { k: 'role', role: 'Environment Art, Eight Style Packs', name: 'Beatrix Solheim' },
  { k: 'role', role: 'Concept Art', name: 'Julinho Cassiano' },
  { k: 'role', role: 'Technical Art & Palette Systems', name: 'Greta Osmundsen' },
  { k: 'role', role: 'VFX, Relay Blast & Screen Clears', name: 'Femke van der Ploeg' },
  { k: 'gap', px: 10 },
  { k: 'sub', text: 'ANIMATION', color: PINK },
  { k: 'role', role: 'Animation Director', name: 'Casimir Dubuque' },
  { k: 'role', role: 'Character Animation', name: 'Yara Delacroix-Osei' },
  // The one credit in this crawl that names a real person. The relay run cycle
  // is the fastest gait in the game (~4.4 strides/s into the portal, see
  // credits-handoff.js), so conditioning is the joke that actually pays off
  // something on screen.
  // One line, not the doubled-up gag the neighbouring departments run. A real
  // name is the only straight credit in the crawl, and the repeat joke would
  // have made it read as another bit.
  { k: 'role', role: 'Run Cycle Conditioning', name: 'Nathan Cook' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'AUDIO' },
  { k: 'role', role: 'Audio Director', name: 'Nathaniel Aubuchon' },
  { k: 'role', role: 'Composer, Original Chiptune Score', name: 'Wilhelmina Sacks' },
  { k: 'role', role: 'Sound Design', name: 'Booker Lindholm' },
  { k: 'role', role: 'Additional Music Programming', name: 'Aksel Berg' },
  { k: 'gap', px: 14 },
  // Mochi has to be the one ARRIVING here — the punchline is the incoming
  // department's line, and hers is the only line she has.
  { k: 'handoff', a: 'AUDIO', b: 'CAST', from: 'b33p', to: 'mochi', lineA: 'Your turn.', lineB: 'POYO.' },
  { k: 'gap', px: 16 },

  { k: 'header', text: 'STARRING', color: GOLD },
  { k: 'castRole', face: 'lorenzo', role: 'Lorenzo "Wrenches" Bracciano', name: '"Big Sal" Marchetti, Local 4' },
  { k: 'castRole', face: 'gnash', role: 'Gnash the Needlemouse', name: 'Credited as Already Left' },
  { k: 'castRole', face: 'fernwick', role: 'Fernwick, Hero of Thyme', name: 'A grocery receipt, itself' },
  { k: 'castRole', face: 'b33p', role: 'Unit B-33P "Blastbot"', name: 'Grievance filed on his behalf' },
  { k: 'castRole', face: 'mochi', role: 'Mochi', name: '"POYO" performed by Mochi' },
  { k: 'castRole', face: 'chompo', role: 'Miss Chomp', name: 'Appetite consultant credited separately' },
  { k: 'castRole', face: 'raymn', role: "Ray M'n, Appendage-Optional", name: 'Limbs insured separately' },
  { k: 'castRole', face: 'grumpos', role: 'Grumpos, Dad of Boy', name: '"BOY" performed with range' },
  { k: 'castRole', face: 'gary', role: 'Gary', name: 'Played by Gary (deceased)' },
  // The one-letter difference is the joke — the actor is emphatically not the
  // character, and the credit insists on it. Do not "fix" the spelling.
  { k: 'castRole', face: 'dolores', role: 'Dolores', name: 'Played by Delores, still on shift' },
  // Heroes and counter staff only. Three deliberate absences:
  //   Don K. Eggshell — he closes the whole crawl with the sequel sting, and a
  //     villain who has the last word should not also be a row in the cast roll.
  //   Dust Devil 9000 — the same call CastState makes in the roll call: he is a
  //     surprise, and a credit spends him before the player has met him.
  //   The TURDLE turtle — no portrait to give, and a nameplate alone reads as
  //     filler next to eleven faces.
  { k: 'gap', px: 22 },

  { k: 'header', text: 'QUALITY ASSURANCE' },
  { k: 'role', role: 'QA Director', name: 'Odell Petrosyan' },
  { k: 'role', role: 'QA Leads', name: 'Ingrid Halvorsen, Chibuzo Amadi' },
  { k: 'role', role: 'Test Engineer, Fairness Simulation', name: 'Milo Standish' },
  { k: 'role', role: 'Compliance Testing, UNPLUGGED Mode', name: 'Renata Szabo, filed under protest' },
  // QA rather than Employee Relations: this department's whole function is
  // telling people they are wrong and being right about it, which is the joke.
  { k: 'role', role: 'Second Opinions', name: 'Flora Crollini (she is aware you disagree)' },
  { k: 'gap', px: 6 },
  { k: 'note', text: 'And forty testers who lost to the Act II vacuum an average of eleven times each' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'LOCALIZATION' },
  { k: 'role', role: 'Director of Localization', name: 'Anezka Dvorak' },
  { k: 'gap', px: 6 },
  { k: 'note', text: 'All dialogue ships pre-shouted; localization was not technically possible' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'MARKETING & COMMUNITY' },
  { k: 'role', role: 'Marketing Director', name: 'Louis Okonjo' },
  { k: 'role', role: 'Community Management', name: 'Priyanka Vats' },
  { k: 'role', role: 'Social & Teaser Strategy', name: 'Django Kessler' },
  { k: 'role', role: 'Trailer Editor', name: 'Saoirse Manwaring' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'BUSINESS' },
  { k: 'role', role: 'President & CEO, Circuit & Splice Interactive', name: 'Cornelius P. Ashgrove III' },
  { k: 'role', role: 'Chief Financial Officer', name: 'Yolanda Rask, approved the budget cuts' },
  { k: 'role', role: 'Board of Directors', name: 'R. Okafor-Lindt, M. Bassignani, T. Achterberg' },
  { k: 'role', role: 'Board Observer, Non-Voting, Seat Disputed', name: 'Don K. Eggshell, PhD' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'FACILITIES' },
  { k: 'role', role: 'Catering & Craft Services', name: "Dolores' Repair Counter — NEXT." },
  { k: 'role', role: 'Custodial & Facilities', name: 'Dust Devil 9000, Deep Clean Engaged' },
  { k: 'role', role: 'IT Support / Power Infrastructure', name: 'Could not be reached' },
  { k: 'gap', px: 20 },

  // HR goes LAST on purpose. By here the crawl has done its thanks-adjacent
  // wind-down through Facilities and reads as nearly over — which is exactly
  // when the largest department in the studio arrives and does not stop.
  { k: 'handoff', a: 'FACILITIES', b: 'HUMAN RESOURCES', from: 'mochi', to: 'chompo', lineA: 'Your turn.', lineB: "We're going to need that in writing." },
  { k: 'gap', px: 16 },

  // The longest department in the crawl, and deliberately so: forms, grievances
  // and compliance are the game's central running joke, so HR out-crediting
  // Engineering and Art combined IS the gag. Do not trim this to match the
  // others — the imbalance is the punchline.
  // One line, not two stacked. Stacked HUMAN / RESOURCES at a width-filling
  // scale was ~200u of crawl — about seven seconds of nothing but the banner
  // before a single name appears. On one line it still spans the full screen
  // and dwarfs every other header, at a quarter of the dwell time.
  { k: 'bigHeader', text: 'HUMAN RESOURCES' },
  { k: 'gap', px: 6 },
  { k: 'mark', prop: 'paperwork', w: 34, h: 27 },
  { k: 'gap', px: 4 },
  { k: 'note', text: 'The studio\'s largest department, by headcount and by volume' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'OFFICE OF THE CHIEF PEOPLE OFFICER', color: PINK },
  { k: 'role', role: 'Chief People Officer', name: 'Beauregard Finch' },
  { k: 'role', role: 'Deputy Chief People Officer', name: 'Marisol Grabowski' },
  { k: 'role', role: 'Chief of Staff to the Chief People Officer', name: 'Aurelio Banning' },
  { k: 'role', role: 'Executive Assistant to the Chief of Staff', name: 'Nadia Fellowes' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'OFFICE OF FORMS', color: PINK },
  { k: 'role', role: 'Director of Forms', name: 'Ignatius Pell' },
  { k: 'role', role: 'Head of Form Design', name: 'Clementine Oyibo' },
  { k: 'role', role: 'Form Design, Sections 1-4', name: 'Rupert Vasquez-Hale' },
  { k: 'role', role: 'Form Design, Section 5 and the Small Print', name: 'Annika Sørhaug' },
  { k: 'role', role: 'Forms About Forms', name: 'Desmond Achterberg' },
  { k: 'role', role: 'Triplicate Coordination', name: 'Lucia Marchetti-Ng' },
  { k: 'role', role: 'Carbon Copy Integrity', name: 'Bartholomew Quist' },
  { k: 'role', role: 'Form Retrieval, Ongoing', name: 'One (1) form remains at large' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'COMPLIANCE & RECORDS', color: PINK },
  { k: 'role', role: 'Head of Compliance', name: 'Solveig Amadi' },
  { k: 'role', role: 'Head of Governance', name: 'Scott Mahony' },
  { k: 'role', role: 'Mandatory Training Module Authorship', name: 'Not Gary' },
  { k: 'role', role: 'Mandatory Training Module Delivery', name: 'Gary' },
  { k: 'role', role: 'Certification & Small Print', name: 'Theodora Blackwood-Osei' },
  { k: 'role', role: 'Records Retention', name: 'Vikram Halloway' },
  { k: 'role', role: 'Filing, Physical', name: 'The only department with hands' },
  // The real credit is what makes the joke under it land: audit is a staffed,
  // functioning discipline right up until the scope reaches Gary.
  { k: 'role', role: 'Internal Audit', name: 'Samantha Bousias' },
  { k: 'role', role: 'Audit, Gary', name: 'Nobody audits Gary' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'EMPLOYEE RELATIONS', color: PINK },
  { k: 'role', role: 'Head of Employee Relations', name: 'Corinne Achebe' },
  { k: 'role', role: 'Deceased Staff Division', name: "Corinne Achebe (Gary's file is thick)" },
  { k: 'role', role: 'Approved Leave, Determinations', name: 'Being deceased is not approved leave' },
  { k: 'role', role: 'Shift Relief Scheduling', name: 'Dolores has not been relieved' },
  { k: 'role', role: 'Roster Maintenance', name: 'Death did not update the roster' },
  { k: 'role', role: 'Morale', name: 'Position unfilled' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'RISK, SAFETY & LEGAL', color: PINK },
  { k: 'role', role: 'Director of Risk & Liability', name: 'Dagny Holm' },
  { k: 'role', role: 'Appliance Safety', name: 'Konstantin Ferreira' },
  { k: 'role', role: 'Electrical Safety', name: 'Konstantin Ferreira, hazard pay pending' },
  { k: 'role', role: 'Limb Insurance, Optional Appendages', name: 'Wilhelmina Strand' },
  { k: 'role', role: 'General Counsel', name: 'Percival Wrenfield, Esq.' },
  { k: 'role', role: 'Outside Counsel for Don K. Eggshell, PhD', name: 'Marchetti, Ohm & Fuse LLP' },
  { k: 'role', role: 'Legally Distinct Naming Review', name: "Gary's Pawn Shop cleared, barely" },
  { k: 'gap', px: 10 },

  // Deliberately the LAST sub-department, so the closing joke below is filed by
  // the people immediately above it rather than by an abstract "this
  // department" nobody has been introduced to yet.
  { k: 'sub', text: 'GRIEVANCES & APPEALS', color: PINK },
  { k: 'role', role: 'Director of Grievances', name: 'Hyacinth Oduya-Bell' },
  { k: 'role', role: 'Grievance Intake', name: 'Emeka Lindqvist' },
  { k: 'role', role: 'Grievance Intake, Overflow', name: 'Petra Nwachukwu' },
  { k: 'role', role: 'Grievance Intake, Overflow Overflow', name: 'Cassius Yamada-Roche' },
  { k: 'role', role: 'Appeals', name: 'Fenella Drummond' },
  { k: 'role', role: 'Appeals of Appeals', name: 'Fenella Drummond, escalated' },
  { k: 'role', role: 'Disputed Jumps, Adjudication', name: 'Osric Tambe' },
  { k: 'role', role: 'Forty-Year Losing Streak Liaison', name: 'A rotating duty nobody volunteers for' },
  { k: 'gap', px: 8 },
  // A role/name row on purpose, not a centred aside. This department escalates
  // entirely through the left column — Intake, Overflow, Overflow Overflow,
  // Appeals, Appeals of Appeals — so its closing joke lands hardest as one more
  // row of the same machine, with a FILING standing where the person's name
  // goes. "Re:" is a subject line rather than a post anybody holds, which is
  // what keeps it from reading as a job; and the white name column is what
  // separates the punchline from the DIM asides in this section.
  { k: 'role', role: 'Grievance Re: The Length Of This Credit', name: 'Filed by the above, against the above' },
  { k: 'gap', px: 12 },

  { k: 'sub', text: 'ADDITIONAL FORMS PROCESSING STAFF', color: PINK },
  { k: 'gap', px: 6 },
  { k: 'wall' },
  { k: 'gap', px: 10 },
  { k: 'note', text: 'And a further 1,140 staff whose forms are still being processed' },
  { k: 'gap', px: 26 },

  { k: 'header', text: 'SPECIAL THANKS', color: GOLD },
  { k: 'note', text: 'To everyone who ever put a quarter in a machine that did not need one.' },
  { k: 'note', text: 'To forty years of heroes who came before and went uncredited, on a technicality.' },
  { k: 'note', text: 'To whoever left the arcade unlocked.' },
  { k: 'note', text: 'To the person who found the receipt Fernwick calls sacred, and did not throw it away.' },
  { k: 'note', text: 'To our families, our playtesters, and our community.' },
  { k: 'note', text: 'To the one door nobody has opened yet.' },
  { k: 'gap', px: 26 },

  { k: 'header', text: 'IN LOVING MEMORY', color: PINK },
  { k: 'gap', px: 6 },
  { k: 'memorial' },
  { k: 'gap', px: 6 },
  { k: 'sub', text: 'GARY.', color: WHITE },
  { k: 'note', text: 'Deceased since before this game began.' },
  { k: 'note', text: 'He asked that this be brief.' },
  { k: 'note', text: 'It is not.' },
  { k: 'gap', px: 28 },

  {
    k: 'para',
    text: 'MASHENSTEIN, THE UNPLUGGENING, THE SOCKET, PLUGS, PRESENTATION ERROR, DOLORES\' REPAIR COUNTER, '
      + 'and GARY\'S LEGALLY DISTINCT PAWN SHOP are trademarks of Circuit & Splice Interactive. All other '
      + 'trademarks are property of their respective, occasionally litigious, owners. Don K. Eggshell, PhD is a '
      + 'fictional character; any resemblance to a real egg, ape, or holder of a doctorate is coincidental and has '
      + 'already been disputed via form. No plumbers, hedgehogs, gods of war, or vacuum cleaners were harmed in the '
      + 'making of this game. Several forms were harmed. One (1) form remains at large.',
  },
  { k: 'gap', px: 22 },
  // The descriptors live inside the rated block now, beside the box.
  { k: 'rated' },
  { k: 'gap', px: 18 },
  { k: 'sub', text: 'A GENERAL APPLIANCE HOLDINGS RELEASE' },
  // Wide enough that this line is fully OFF the top once the crawl settles.
  // The closing card is the one frame that holds still for as long as you let
  // it, so it is the one frame where a half-cut line reads as a bug rather than
  // as mid-scroll. At 44 the release line came to rest straddling y=0 with its
  // top half sheared off; the card itself is unchanged, it just gets clear air
  // above it now. Anything under ~53 puts that line back into the frame.
  { k: 'gap', px: 66 },

  { k: 'socket' },
  { k: 'gap', px: 8 },
  { k: 'sub', text: 'THE LED BLINKS TWICE. THE SOCKET STAYS LIT.', color: CYAN },
  { k: 'gap', px: 10 },
  { k: 'title2', text: 'DON K. EGGSHELL, PHD WILL RETURN IN:' },
  { k: 'title2', text: 'A GRIEVANCE, ITEMIZED.' },
  { k: 'gap', px: 10 },
  { k: 'note', text: 'A form is already being filed about this sequel.' },
  { k: 'gap', px: 22 },

  // The crawl comes to rest here — REST_Y anchors on the LAST row, so the
  // copyright is what stays on screen while the track keeps playing.
  { k: 'note', text: `© ${CREDITS_YEAR} CIRCUIT & SPLICE INTERACTIVE LTD.   ALL RIGHTS RESERVED.`, color: FG },
  { k: 'gap', px: 40 },
];

// Scale a line so it spans a target width. Used only by HUMAN RESOURCES, whose
// banner is sized to the screen rather than to a type ramp — the department
// out-sizing every other header is the joke, so it is measured, not guessed.
function fillScale(text, target, style = 'title') {
  return target / Math.max(1, textWidth(text, 1, style));
}
// Ceiling on that measurement. sprites.js rasterizes every glyph into its own
// supersampled canvas at GLYPH_SS (8-16x, following display density), so the
// cached bitmap grows with the SQUARE of this number: an uncapped fit put a
// short word near 15x, which is a ~1176x1411 canvas per glyph at SS=8 and four
// times that on a high-density display. 9 still crosses the full screen.
const BIG_HEADER_MAX = 9;

// The anonymous bulk of the department. Three dense columns of nothing but
// names, filling the full width, directly under the airy centred single column
// every other department gets.
const HR_WALL = [
  'Marguerite Ashworth-Boyle', 'Teodoro Nakamura-Vance', 'Philippa Okonjo',
  'Anselm Braithwaite', 'Rosalind Ekwueme', 'Gustav Lindenbaum',
  'Coretta Villanueva', 'Absalom Petrie', 'Ingrid Sowande',
  'Barnaby Ochterlony', 'Delphine Mbeki-Rausch', 'Horace Tiddington',
  'Yolanda Krupnik', 'Emmerich Vaughn-Ade', 'Perpetua Halloran',
  'Silvio Abernathy', 'Kwabena Thorsen', 'Millicent Dragomir',
  'Fitzwilliam Osei-Blunt', 'Agnieszka Ferreira', 'Cornelius Dubois',
  'Bernadette Achterberg', 'Ptolemy Ranganathan', 'Lisbeth Okoro-Vance',
  'Ambrose Kaczmarek', 'Henrietta Nwosu', 'Casimir Underhill',
  'Beatrice Salvatierra', 'Reginald Adeyemi-Fox', 'Ottilie Brandvold',
  'Mordecai Chukwu', 'Guinevere Pettibone', 'Aloysius Tanaka-Reeve',
  'Drusilla Fenwick', 'Ezekiel Modise', 'Wilhelmina Grattan',
  'Percival Anand-Hoyle', 'Clothilde Bassey', 'Ignatius Vandersteen',
  'Euphemia Larsson', 'Thaddeus Olawale', 'Marguerite Pyle',
  'Leopold Nkosi-Barr', 'Antonia Wexford', 'Balthazar Ojukwu',
  'Seraphina Holt-Mbaye', 'Auberon Kristiansen', 'Philomena Dasgupta',
];
// Three columns at 0.8. The earlier phone-legibility pass dropped this to two
// AND raised the scale from 0.7, when only the scale was ever the problem: 0.7
// is about 0.9mm of cap height on a phone, under half the game's own baseline.
// A third of (W - 28) is 150u and the longest name sets at ~120u, so three
// columns fit comfortably at the readable size — and three is what makes the
// block read as a wall.
const HR_WALL_COLS = 3;
const HR_WALL_ROW_H = 11;
const HR_WALL_SCALE = 0.8;

// Phone only — NOT "is this a touch device". An iPad reports a coarse pointer
// just like an iPhone does, but it has the screen to read 0.85 comfortably, so
// keying off touch would enlarge the boilerplate on the one tablet that never
// needed it. readPlatform already draws exactly this line for the install gate.
function isPhone() {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const p = readPlatform();
    return p.isIphone || p.isAndroidPhone;
  } catch {
    return false; // headless tests and odd embeddings keep the desktop setting
  }
}

// Applies to the legal block AND every one-line aside. They are all the same
// register of text and were all reported as small on a phone, so they move
// together rather than the paragraph alone getting the fix.
const BODY_SCALE_PHONE = 1;
const BODY_SCALE_WIDE = 0.85;
function bodyScale() { return isPhone() ? BODY_SCALE_PHONE : BODY_SCALE_WIDE; }
const noteRowH = (s) => Math.round(12 * (s / BODY_SCALE_WIDE));

function layoutCredits() {
  const rows = [];
  let y = 0;
  // Height travels WITH the row so draw() can cull on the row's real extent.
  // A block row (the memorial toon, the 160u wall of names) reaches far below
  // its own anchor, and a single shared cull margin either clipped those early
  // or kept every row alive far off-screen.
  const push = (row, h) => { rows.push({ ...row, y, h }); y += h; };
  for (const item of SCRIPT) {
    switch (item.k) {
      case 'gap': y += item.px; break;
      case 'title': push(item, 26); break;
      case 'title2': push(item, 18); break;
      case 'sub': push(item, 15); break;
      case 'note': {
        const s = item.scale || bodyScale();
        push({ ...item, scale: s }, noteRowH(s));
        break;
      }
      case 'header': push(item, 18); break;
      case 'role': push(item, 13); break;
      // Tall enough that an 18u portrait clears its neighbours' lettering.
      case 'castRole': push(item, 21); break;
      case 'mark': push(item, item.h + 7); break;
      // Measured against the reachable width, not the 480-unit design box, so
      // the banner truly spans the screen it is on rather than a nominal one.
      case 'bigHeader': {
        const s = Math.min(BIG_HEADER_MAX, fillScale(item.fit || item.text, safeBox().width));
        push({ ...item, scale: s }, Math.round(11 * s));
        break;
      }
      case 'wall':
        push(item, Math.ceil(HR_WALL.length / HR_WALL_COLS) * HR_WALL_ROW_H);
        break;
      case 'memorial': push(item, 62); break;
      case 'rated': push(item, RATED_BOX_H + 8); break;
      case 'socket': push(item, 34); break;
      // No bracketed "[ RELAY HANDOFF: A → B ]" banner and no DEPARTMENT:
      // speaker prefixes — both are screenplay formatting, and a credit roll is
      // not a script. The portal and the two toons say "handoff" on their own,
      // and the sections either side of it say who is talking.
      //
      // artDY is how far ABOVE each dialogue line its own hand-off block sits.
      // The lines fade in with their speaker, and the speaker's timing comes
      // from where the ART is on screen — so a line has to be able to ask
      // about a row other than itself.
      case 'handoff': {
        const artY = y;
        push({ k: 'handoffArt', from: item.from, to: item.to }, HANDOFF_H);
        // One line, not two stacked. Both halves of the exchange share a
        // baseline and split around a gap the width of the portal above them,
        // so the reply reads as an answer across the portal rather than as a
        // second caption underneath the first.
        push({
          k: 'handoffDuo',
          a: `"${item.lineA}"`,
          b: `"${item.lineB}"`,
          artDY: artY - y,
        }, 16);
        break;
      }
      // The densest block in the crawl, and the one that suffers most on a
      // small screen. A phone gets it a size up (and wrapped fresh at that
      // size, so the wrap matches the type); a tablet or desktop keeps the
      // small setting, where boilerplate belongs and is perfectly legible.
      case 'para': {
        const s = bodyScale();
        const lineH = Math.round(11 * (s / BODY_SCALE_WIDE));
        for (const line of wrapText(item.text, BODY_W, s, 60, 'ui')) {
          push({ k: 'note', text: line, color: DIM, scale: s }, lineH);
        }
        break;
      }
      default: break;
    }
  }
  return { rows, total: y, lastY: rows.length ? rows[rows.length - 1].y : 0 };
}

// The one wall socket in the game with a painter. THE SOCKET is prose
// everywhere else — the finale never draws it — so rather than take a
// production dependency on props.js' `plugSocket`, which is gallery-only and
// documented to be deleted alongside its bake-off section, this screen owns
// its own. Faceplate, two slots, earth pin, and the LED the copy promises.
function drawSocket(ctx, cx, cy, t) {
  const w = 26, h = 30;
  const x = cx - w / 2, y = cy - h / 2;
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#b9b3a8';
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillStyle = '#1a1622';
  ctx.fillRect(x + 7, y + 7, 3, 9);
  ctx.fillRect(x + w - 10, y + 7, 3, 9);
  ctx.beginPath();
  ctx.arc(cx, y + 22, 3, 0, Math.PI * 2);
  ctx.fill();
  // Live, not decorative: two quick blinks, then a long hold lit.
  const blink = t % 3.2;
  const lit = blink < 0.25 || (blink >= 0.5 && blink < 0.75) || blink >= 1.4;
  ctx.fillStyle = lit ? '#74c947' : '#20301c';
  ctx.fillRect(cx - 1, y + 2, 2, 2);
  if (lit) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#74c947';
    ctx.fillRect(cx - 3, y, 6, 6);
    ctx.globalAlpha = 1;
  }
}

// A rating mark, drawn the way rating marks are actually built: the box holds
// only the letter grade and the word under it. The descriptors are NOT in the
// box — they sit alongside it. (An earlier pass drew a rectangle around the
// words "RATED E", which is not a thing any rating board does.)
const RATED_BOX_W = 34;
const RATED_BOX_H = 42;
// Rule position inside the box, splitting it into the grade band and the word
// band. Everything else in the mark is centred against one of those two.
const RATED_RULE_Y = 30;
const RATED_GRADE_S = 2.6;
const RATED_LABEL_S = 0.5;
const RATED_LINE_1 = 'FOR EVERYONE WHO CAN FILE A FORM IN TRIPLICATE';
const RATED_LINE_2 = 'Mild Cartoon Violence · Comic Bureaucracy · Sustained Appliance Peril';

function drawRatedBox(ctx, cx, y) {
  const s1 = 0.75, s2 = 0.7;
  const textW = Math.max(textWidth(RATED_LINE_1, s1), textWidth(RATED_LINE_2, s2));
  const x = Math.round(cx - (RATED_BOX_W + 10 + textW) / 2);
  const top = Math.round(y);
  const ruleY = top + RATED_RULE_Y;
  const cxBox = x + RATED_BOX_W / 2;

  ctx.strokeStyle = FG;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, top + 0.5, RATED_BOX_W, RATED_BOX_H);

  // Each band centres its OWN ink: the grade in the space above the rule, the
  // word in the space below it, the descriptors against the box as a whole.
  // Hand-picked y offsets had the E riding high over a pool of dead space,
  // because a glyph's ink does not start at the y you hand drawText.
  drawTextCentered(ctx, 'E', cxBox, textYForMid((top + ruleY) / 2, RATED_GRADE_S), WHITE, RATED_GRADE_S, 'title');
  ctx.fillStyle = FG;
  ctx.fillRect(x + 3, ruleY, RATED_BOX_W - 6, 1);
  drawTextCentered(ctx, 'EVERYONE', cxBox, textYForMid((ruleY + top + RATED_BOX_H) / 2, RATED_LABEL_S), FG, RATED_LABEL_S);

  const tx = x + RATED_BOX_W + 10;
  const mid = top + RATED_BOX_H / 2;
  drawText(ctx, RATED_LINE_1, tx, textYForMid(mid - 7, s1), GOLD, s1);
  drawText(ctx, RATED_LINE_2, tx, textYForMid(mid + 7, s2), DIM, s2);
}

function drawRow(ctx, row, y, t) {
  switch (row.k) {
    case 'title': drawTextCentered(ctx, row.text, CX, y, WHITE, 1.8, 'title'); break;
    case 'title2': drawTextCentered(ctx, row.text, CX, y, GOLD, 1.2, 'title'); break;
    case 'sub': drawTextCentered(ctx, row.text, CX, y, row.color || FG, 1); break;
    case 'note': drawTextCentered(ctx, row.text, CX, y, row.color || DIM, row.scale || 0.85); break;
    case 'header': drawTextCentered(ctx, row.text, CX, y, row.color || CYAN, 1.3, 'title'); break;
    case 'role': {
      const gap = 6;
      drawText(ctx, row.role, CX - gap - textWidth(row.role, 0.85), y, FG, 0.85);
      drawText(ctx, row.name, CX + gap, y, WHITE, 0.85);
      break;
    }
    // The whole exchange on one baseline: the outgoing hero's line comes to rest
    // just left of the portal's column, the reply just right of it. Neither is a
    // caption. Each half arrives with the hero who says it AND travels with them
    // — trailing behind the runner and settling into that slot as their leg of
    // the relay finishes — so the words cross the screen the way the relay does,
    // left to right, and the reply is never on screen before anyone is there to
    // have said it.
    case 'handoffDuo': {
      const s = 0.85;
      const artY = y + (row.artDY || 0);
      const p = Math.max(0, Math.min(1, (H - artY) / (H + HANDOFF_H)));
      const fade = (from) => Math.max(0, Math.min(1, (p - from) / 0.10));
      // The same box the art row hands the painter, so the two read one staging.
      const left = handoffRunLeft({ progress: p, x: 0, y: artY, w: W, h: HANDOFF_H });

      const aAlpha = fade(HANDOFF_LINE_A_AT);
      if (aAlpha > 0) {
        const w = textWidth(row.a, s);
        ctx.save();
        ctx.globalAlpha = aAlpha;
        // Trails the outgoing hero in from the left and lands in its slot on the
        // frame the portal takes them — the words catch up as the runner stops.
        drawText(ctx, row.a, Math.max(6, CX - HANDOFF_GAP - w - HANDOFF_LINE_CARRY * left.a), y, OUTGOING_INK, s);
        ctx.restore();
      }
      const bAlpha = fade(HANDOFF_LINE_B_AT);
      if (bAlpha > 0) {
        const w = textWidth(row.b, s);
        const bx = Math.min(CX + HANDOFF_GAP, W - 6 - w);
        // The reply comes out of the portal on the incoming hero's heels and is
        // still catching up with itself as they run off, so it settles late —
        // which is the half of the exchange that has the time to be watched.
        //
        // Its trail is not the outgoing line's: it starts left-aligned on the
        // MIDDLE of the portal, the mouth it and the hero both come out of, and
        // slides right into its slot behind them. Measured from wherever it
        // settles rather than set as a distance, so a reply long enough to be
        // pushed left off its slot still emerges from the portal and not from
        // somewhere inside the gap the two halves keep.
        ctx.save();
        ctx.globalAlpha = bAlpha;
        drawText(ctx, row.b, bx - Math.max(0, bx - CX) * left.b, y, INCOMING_INK, s);
        ctx.restore();
      }
      break;
    }
    // The departments hand off the way the cast does. The staging itself is
    // under bake-off (credits-handoff.js, and the gallery's lab section), so
    // the painter lives there and this only supplies the box and the timing.
    //
    // Progress is keyed to where the block sits ON SCREEN rather than to a
    // free-running clock: a candidate that animates a whole swap then plays it
    // out exactly as it crosses, so you always catch the entire beat instead
    // of whatever frame the loop happened to be on when it scrolled in.
    case 'handoffArt': {
      const progress = Math.max(0, Math.min(1, (H - y) / (H + HANDOFF_H)));
      drawHandoff(ctx, { from: row.from, to: row.to, t, progress, x: 0, y, w: W, h: HANDOFF_H });
      break;
    }
    case 'castRole': {
      const gap = 6;
      drawText(ctx, row.role, CX - gap - textWidth(row.role, 0.85), y, FG, 0.85);
      drawText(ctx, row.name, CX + gap, y, WHITE, 0.85);
      // Every cast row is a toon portrait now. The prop-portrait branch that
      // used to live here served only Eggshell and the Dust Devil, both since
      // cut from this list; it went with them rather than sitting unexercised.
      drawToonFace(ctx, row.face, FACE_X, y + ROW_INK_MID - FACE_BOX / 2, FACE_BOX, FACE_BOX);
      break;
    }
    // A department/studio mark on its own card. These ship around 13x8 in the
    // field guide and read as a stray squiggle at anything near that size here,
    // so a mark gets to be the biggest thing on its own line.
    case 'mark': drawProp(ctx, row.prop, CX - row.w / 2, y + 2, row.w, row.h); break;
    case 'memorial': {
      // He is not posed heroically and he is not winking at the camera. He is
      // standing at his counter, as he has been the whole game.
      const pose = { kind: 'idle', grounded: true, time: t, menu: true };
      drawToon(ctx, 'gary', pose, CX, y + 58, 54);
      break;
    }
    // Centred on the reachable box rather than on W/2: on a phone whose notch
    // eats one side, those two are not the same point, and a full-bleed banner
    // centred on the wrong one runs off under the cutout.
    case 'bigHeader': drawTextCentered(ctx, row.text, safeBox().cx, y, PINK, row.scale, 'title'); break;
    case 'wall': {
      // The banner is full-bleed on purpose; a column of names flush to the
      // bezel just looks clipped, so the wall keeps a little air.
      const box = safeBox();
      const inset = 8;
      const colW = (box.width - inset * 2) / HR_WALL_COLS;
      HR_WALL.forEach((n, i) => {
        const col = i % HR_WALL_COLS;
        const line = Math.floor(i / HR_WALL_COLS);
        // Centred in its own column. These names run from 11 to 26 characters,
        // so a left edge shared by three of them left ragged gaps down the
        // right of each column; centred, the block reads as three columns of
        // names rather than one badly justified paragraph.
        const cx = box.x0 + inset + (col + 0.5) * colW;
        drawTextCentered(ctx, n, cx, y + line * HR_WALL_ROW_H, FG, HR_WALL_SCALE);
      });
      break;
    }
    case 'rated': drawRatedBox(ctx, CX, y); break;
    case 'socket': drawSocket(ctx, CX, y + 17, t); break;
    default: break;
  }
}

export class CreditsState {
  // Read by the FPS readout in main.js. A credit roll is the one screen whose
  // whole job is to be looked at, and a diagnostic parked over it is in the
  // shot — the same reasoning that already stands the readout down while the
  // visualizer's titles are up.
  static hidesFps = true;

  // settings is optional: the sky only reads reducedMotion off it, and a caller
  // that has no settings to hand still gets a (moving) starfield.
  constructor({ onDone, settings }) { this.onDone = onDone; this.settings = settings || {}; }
  enter() {
    this.t = 0;
    this.atRest = false;
    this.script = layoutCredits();
    this.restT = Math.max(0, (H + this.script.lastY - REST_Y) / SCROLL_SPEED);
    // The instant each hand-off block hits the swap, in crawl-clock seconds.
    //
    // Fired from the clock rather than from the painter on purpose: drawRow()
    // runs every frame, so triggering there would retrigger for every frame the
    // block sat near the swap. A block's progress is a linear function of t
    // (progress = (t*SCROLL_SPEED - row.y) / (H + HANDOFF_H)), so the crossing
    // happens at exactly one t — solve for it once here, then watch the clock
    // step over it. Scrubbing backwards past a block re-arms it for free.
    //
    // Fired AHEAD of the crossing, not on it. The cue's weight sits that far into
    // it, so triggering on the swap put the rising half over the incoming hero's
    // exit and the punch a fifth of a second behind the flare. Leading it lands
    // the weight on the flare and puts the rise where it belongs: under the
    // outgoing hero's last few strides.
    //
    // Asked of the SHAPE rather than hardcoded, because the credits cue is six times
    // longer than the bare one this used to fire and its middle moved with it — 0.60s
    // in, not 0.20s. Each swap has ~4.8s of runway and the four of them are tens of
    // seconds apart, so there is nothing for a lead that long to collide with. See
    // portalCueFlashAt and PORTAL_RELAY_CREDITS.
    this.swapTs = this.script.rows
      .filter((r) => r.k === 'handoffArt')
      .map((r) => (HANDOFF_SWAP_AT * (H + HANDOFF_H) + r.y) / SCROLL_SPEED
        - portalCueFlashAt(PORTAL_RELAY_CREDITS));
    this.scrubHeldT = 0;
    this.reduced = !!this.settings.reducedMotion;
    this.stars = makeStars(STAR_COUNT);
    Audio.setBank(MEGAMIX_THEME);
    Input.setMenuButtons();
    // Up/down here mean "scrub the crawl while held", not "move down a row". A
    // wheel tick presses without ever releasing, so one flick of the wheel put
    // the roll into fast-forward until the stuck-hold guard below noticed. The
    // arrow keys are the scrub control; the wheel does nothing on this screen.
    Input.wheelNav = false;
    // Same guard CastState uses. actionForKey() resolves a key to a DIFFERENT
    // action per context, so an arrow held across the transition into this
    // screen registers its keydown under one action and its keyup under
    // another — and the first one is then held forever, which reads as the
    // crawl arriving already stuck in fast-forward.
    Input.clearAll();
  }
  exit() {
    Audio.setBank(null);
    Input.wheelNav = true;   // every other list still scrolls with the wheel
    Input.clearAll(); // and never leak a held arrow out into the next screen
  }
  update(dt) {
    // Hold an arrow to scrub. Forward runs at 1+SCRUB_RATE, back at
    // 1-SCRUB_RATE, so rewind is a touch slower than fast-forward — the crawl
    // is being read, and overshooting backwards past the thing you wanted is
    // more annoying than creeping up on it.
    let rate = 1;
    if (Input.held('right') || Input.held('down')) rate += SCRUB_RATE;
    if (Input.held('left') || Input.held('up')) rate -= SCRUB_RATE;
    this.scrubbing = rate !== 1;
    // Self-heal for a held action that never got its release (see enter()).
    // Scrubbing crosses the whole crawl in restT/SCRUB_RATE seconds, so a hold
    // still running well past that is not a finger — it is a lost keyup. Hand
    // the actions back so the screen recovers instead of scrubbing forever.
    this.scrubHeldT = this.scrubbing ? this.scrubHeldT + dt : 0;
    if (this.scrubHeldT > SCRUB_STUCK_T) {
      for (const a of ['left', 'right', 'up', 'down']) Input.release(a);
      this.scrubHeldT = 0;
      this.scrubbing = false;
      rate = 1;
    }
    const prevT = this.t;
    this.t = Math.min(this.restT, Math.max(0, this.t + dt * rate));
    this.atRest = this.t >= this.restT;
    // The swoosh, on the frame the clock crosses a hand-off's swap. Half-open
    // on the left so a paused-exactly-on-it clock cannot fire twice, and only
    // forwards — rewinding through a block re-arms it but stays silent, because
    // a backwards swoosh is the one thing the sound cannot describe.
    if (this.t > prevT) {
      for (const swapT of this.swapTs) {
        if (swapT > prevT && swapT <= this.t) {
          Audio.sfx('portal', { gain: CREDITS_SWAP_GAIN, shape: PORTAL_RELAY_CREDITS });
        }
      }
    }
    if (this.t > OPEN_GUARD_T && (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('pointer'))) {
      Audio.sfx('ui');
      this.onDone();
      Input.endFrame();
      return;
    }
    Input.endFrame();
  }
  draw(ctx) {
    const scrollY = H - this.t * SCROLL_SPEED;
    // Full-bleed: the sky covers the whole canvas, safe area included. Only the
    // things you must be able to READ get inset.
    drawSky(ctx, this.stars, this.t, this.t * SCROLL_SPEED, this.reduced);
    for (const row of this.script.rows) {
      const y = scrollY + row.y;
      // Cull on the row's own extent. The 20u pad covers the few painters that
      // reach slightly outside their box (a cast portrait is centred on the
      // lettering, so it overhangs the row top by a few units).
      if (y + (row.h || 0) < -20 || y > H + 20) continue;
      drawRow(ctx, row, y, this.t);
    }
    // Corner legends rather than a full-width band across the bottom. The band
    // was a permanent bar of chrome parked over the crawl; two small plated
    // labels tucked into the corners stay legible over even the full-width wall
    // of names without reserving a strip of screen for themselves.
    //
    // A phone has no arrows to hold, so it is never told about scrubbing. And
    // once the crawl has settled on the closing card there is nothing left to
    // skip, so the prompt stops offering to skip and offers the way out.
    // Chrome, not content: pushed to the very bottom edge and set small so the
    // legend stays available without competing with the crawl. (The mobile
    // legibility floor that governs the wall of names deliberately does not
    // apply here — this is a persistent hint you read once, not a credit.)
    const s = HINT_SCALE;
    // "TAP TO BACK" is not a sentence — touch and keyboard need different words
    // for the same idea, so they get their own pair rather than sharing a verb.
    const touch = Input.isTouchDevice();
    const exit = touch
      ? (this.atRest ? 'TAP TO RETURN' : 'TAP TO SKIP')
      : `${Input.confirmVerb()} / ESC: ${this.atRest ? 'BACK' : 'SKIP'}`;
    // Anchored to the reachable box, and lifted clear of a home indicator.
    const box = safeBox();
    const hintY = HINT_Y - box.bottom;
    if (!touch) {
      drawText(ctx, '← → HOLD TO SCRUB', box.x0 + 2, hintY, this.scrubbing ? GOLD : DIM, s, 'ui', UI_PLATE);
    }
    drawText(ctx, exit, box.x1 - 2 - textWidth(exit, s), hintY, DIM, s, 'ui', UI_PLATE);
  }
}
