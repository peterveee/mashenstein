// Fake AAA end-credits crawl. Dev-menu only for now (see 'CREDITS' under
// SCENES in src/dev/menus.js) — there is no production route to it yet.
// CREDITS.md at the repo root is the prose original; this is the shipped cut of
// it. The two carry the same roles, names and jokes, but not the same
// presentation — the screen drops the markdown's screenplay-style handoff
// headings in favour of drawing the handoff, and adds art rows the document has
// no way to express. Nothing here parses that file; keep the two in step by
// hand when the wording changes.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawText, drawTextCentered, textWidth, wrapText, UI_PLATE } from '../engine/sprites.js';
import { drawToon, drawToonFace } from '../sprites/toons.js';
import { drawProp, propFrames, propFps } from '../sprites/props.js';
import { MEGAMIX_THEME } from '../data/megamix.js';

const GOLD = '#f6d33c';
const CYAN = '#48e0c8';
const PINK = '#f890b8';
const DIM = '#5a5a68';
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
// Where the final row comes to rest. The crawl does NOT scroll away into an
// empty screen and does NOT eject you: it settles on the closing socket /
// sequel card and holds there, music still running, until you leave.
const REST_Y = 200;
// How far the two heroes in a relay stand either side of the portal. The
// dialogue lines are centred on these same offsets so each line sits under the
// character saying it — with the speaker prefixes gone, position and colour are
// the only things left carrying attribution.
const HANDOFF_DX = 44;
const OUTGOING_INK = '#48e0c8';
const INCOMING_INK = '#f6d33c';

// ---- content, declared top to bottom in the order it scrolls -------------
const SCRIPT = [
  { k: 'title', text: 'MASHENSTEIN: THE UNPLUGGENING' },
  { k: 'title2', text: 'END CREDITS' },
  { k: 'gap', px: 18 },
  { k: 'mark', prop: 'cord', w: 38, h: 23 },
  { k: 'gap', px: 6 },
  { k: 'sub', text: 'A CIRCUIT & SPLICE INTERACTIVE PRODUCTION', color: GOLD },
  { k: 'sub', text: 'IN ASSOCIATION WITH RECLAIMED PARTS STUDIOS' },
  { k: 'note', text: 'a division of General Appliance Holdings, Unincorporated' },
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
  { k: 'role', role: 'THE SURGE', name: 'the entire Design department, at once' },
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
  { k: 'castRole', face: 'gnash', role: 'Gnash the Needlemouse', name: 'credited as Already Left' },
  { k: 'castRole', face: 'fernwick', role: 'Fernwick, Hero of Thyme', name: 'a grocery receipt, itself' },
  { k: 'castRole', face: 'b33p', role: 'Unit B-33P "Blastbot"', name: 'grievance filed on his behalf' },
  { k: 'castRole', face: 'mochi', role: 'Mochi', name: '"POYO" performed by Mochi' },
  { k: 'castRole', face: 'chompo', role: 'Miss Chomp', name: 'appetite consultant credited separately' },
  { k: 'castRole', face: 'raymn', role: "Ray M'n, Appendage-Optional", name: 'limbs insured separately' },
  { k: 'castRole', face: 'grumpos', role: 'Grumpos, Dad of Boy', name: '"BOY" performed with range' },
  { k: 'castRole', prop: 'eggshell', propW: 20, propH: 17, role: 'Don K. Eggshell, PhD', name: 'played by himself, thesis on request' },
  { k: 'castRole', face: 'gary', role: 'Gary', name: 'played by Gary (deceased)' },
  // The one-letter difference is the joke — the actor is emphatically not the
  // character, and the credit insists on it. Do not "fix" the spelling.
  { k: 'castRole', face: 'dolores', role: 'Dolores', name: 'played by Delores, still on shift' },
  // The Dust Devil and the TURDLE turtle are deliberately NOT in this list, for
  // the same reason CastState leaves the Dust Devil out of the roll call: he is
  // a surprise, and a credit spends him before the player has met him. The
  // turtle has no portrait to give and reads as filler without one.
  { k: 'gap', px: 22 },

  { k: 'header', text: 'QUALITY ASSURANCE' },
  { k: 'role', role: 'QA Director', name: 'Odell Petrosyan' },
  { k: 'role', role: 'QA Leads', name: 'Ingrid Halvorsen, Chibuzo Amadi' },
  { k: 'role', role: 'Test Engineer, Fairness Simulation', name: 'Milo Standish' },
  { k: 'role', role: 'Compliance Testing, UNPLUGGED Mode', name: 'Renata Szabo, filed under protest' },
  { k: 'gap', px: 6 },
  { k: 'note', text: 'and forty testers who lost to the Act II vacuum an average of eleven times each' },
  { k: 'gap', px: 22 },

  { k: 'header', text: 'LOCALIZATION' },
  { k: 'role', role: 'Director of Localization', name: 'Anezka Dvorak' },
  { k: 'gap', px: 6 },
  { k: 'note', text: 'all dialogue ships pre-shouted; localization was not technically possible' },
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
  { k: 'role', role: 'IT Support / Power Infrastructure', name: 'could not be reached' },
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
  { k: 'note', text: 'the studio\'s largest department, by headcount and by volume' },
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
  { k: 'role', role: 'Form Retrieval, Ongoing', name: 'one (1) form remains at large' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'COMPLIANCE & RECORDS', color: PINK },
  { k: 'role', role: 'Head of Compliance', name: 'Solveig Amadi' },
  { k: 'role', role: 'Mandatory Training Module Authorship', name: 'not Gary' },
  { k: 'role', role: 'Mandatory Training Module Delivery', name: 'Gary' },
  { k: 'role', role: 'Certification & Small Print', name: 'Theodora Blackwood-Osei' },
  { k: 'role', role: 'Records Retention', name: 'Vikram Halloway' },
  { k: 'role', role: 'Filing, Physical', name: 'the only department with hands' },
  { k: 'role', role: 'Audit', name: 'nobody audits Gary' },
  { k: 'gap', px: 10 },

  { k: 'sub', text: 'EMPLOYEE RELATIONS', color: PINK },
  { k: 'role', role: 'Head of Employee Relations', name: 'Corinne Achebe' },
  { k: 'role', role: 'Deceased Staff Division', name: "Corinne Achebe (Gary's file is thick)" },
  { k: 'role', role: 'Approved Leave, Determinations', name: 'being deceased is not approved leave' },
  { k: 'role', role: 'Shift Relief Scheduling', name: 'Dolores has not been relieved' },
  { k: 'role', role: 'Roster Maintenance', name: 'death did not update the roster' },
  { k: 'role', role: 'Morale', name: 'position unfilled' },
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
  { k: 'role', role: 'Forty-Year Losing Streak Liaison', name: 'a rotating duty nobody volunteers for' },
  { k: 'gap', px: 8 },
  { k: 'role', role: 'Grievance Re: The Length Of This Credit', name: 'filed by the above, against the above' },
  { k: 'gap', px: 12 },

  { k: 'sub', text: 'ADDITIONAL FORMS PROCESSING STAFF', color: PINK },
  { k: 'gap', px: 6 },
  { k: 'wall' },
  { k: 'gap', px: 10 },
  { k: 'note', text: 'and a further 1,140 staff whose forms are still being processed' },
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
  { k: 'gap', px: 44 },

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
// Two columns, not three. Three fit the names at 0.7, which on a phone is about
// 0.9mm of cap height — under half the game's own baseline (every other menu
// sets body text at scale 1) and past the point where a name reads as a name
// rather than as grey texture. Two wider columns carry the same 48 names at a
// legible size and still fill the screen, which was the whole point of the wall.
const HR_WALL_COLS = 2;
const HR_WALL_ROW_H = 11;
const HR_WALL_SCALE = 0.8;

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
      case 'note': push(item, 12); break;
      case 'header': push(item, 18); break;
      case 'role': push(item, 13); break;
      // Tall enough that an 18u portrait clears its neighbours' lettering.
      case 'castRole': push(item, 21); break;
      case 'mark': push(item, item.h + 7); break;
      case 'bigHeader': {
        const s = Math.min(BIG_HEADER_MAX, fillScale(item.fit || item.text, W - 30));
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
      case 'handoff':
        push({ k: 'handoffArt', from: item.from, to: item.to }, 48);
        push({ k: 'handoffLine', text: `"${item.lineA}"`, side: -1 }, 13);
        push({ k: 'handoffLine', text: `"${item.lineB}"`, side: 1 }, 13);
        break;
      case 'para':
        for (const line of wrapText(item.text, BODY_W, 0.85, 60, 'ui')) push({ k: 'note', text: line, color: DIM, scale: 0.85 }, 11);
        break;
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
const RATED_LINE_1 = 'FOR EVERYONE WHO CAN FILE A FORM IN TRIPLICATE';
const RATED_LINE_2 = 'Mild Cartoon Violence · Comic Bureaucracy · Sustained Appliance Peril';

function drawRatedBox(ctx, cx, y) {
  const s1 = 0.75, s2 = 0.7;
  const textW = Math.max(textWidth(RATED_LINE_1, s1), textWidth(RATED_LINE_2, s2));
  const x = Math.round(cx - (RATED_BOX_W + 10 + textW) / 2);

  ctx.strokeStyle = FG;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, Math.round(y) + 0.5, RATED_BOX_W, RATED_BOX_H);
  // The grade, then a rule, then the word it stands for — all inside the box.
  drawTextCentered(ctx, 'E', x + RATED_BOX_W / 2, y + 3, WHITE, 2.2, 'title');
  ctx.fillStyle = FG;
  ctx.fillRect(x + 3, y + RATED_BOX_H - 12, RATED_BOX_W - 6, 1);
  drawTextCentered(ctx, 'EVERYONE', x + RATED_BOX_W / 2, y + RATED_BOX_H - 10, FG, 0.5);

  const tx = x + RATED_BOX_W + 10;
  drawText(ctx, RATED_LINE_1, tx, y + 10, GOLD, s1);
  drawText(ctx, RATED_LINE_2, tx, y + 24, DIM, s2);
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
    case 'handoffLine': {
      const s = 0.85;
      const w = textWidth(row.text, s);
      // Centred on its speaker, then clamped back on-screen so a long line
      // leans toward the right character instead of running off the edge.
      const want = CX + row.side * HANDOFF_DX - w / 2;
      const x = Math.max(8, Math.min(W - 8 - w, want));
      drawText(ctx, row.text, x, y, row.side < 0 ? OUTGOING_INK : INCOMING_INK, s);
      break;
    }
    // The departments hand off the way the cast does: outgoing hero running
    // into the portal, incoming hero already running out of it. Both face
    // right, which is the direction the whole game runs in.
    case 'handoffArt': {
      const feetY = y + 42;
      // Scaled to stand with the 34u toons rather than to the field guide's
      // 12u icon. The painter's inner glint is drawn at w*0.16, so at 14 wide
      // it collapsed into a hook that read as a stray glyph; at 22 it resolves
      // as the highlight it is.
      const portalH = 40 + Math.round(Math.sin(t * 5) * 2);
      drawProp(ctx, 'portal', CX - 11, feetY - portalH, 22, portalH);
      const pose = (offset) => ({
        kind: 'run', grounded: true, menu: true, time: t,
        phase: (t * 1.6 + offset) % 1,
      });
      // Half a stride apart so the two figures never mirror each other.
      drawToon(ctx, row.from, pose(0), CX - HANDOFF_DX, feetY, 34);
      drawToon(ctx, row.to, pose(0.5), CX + HANDOFF_DX, feetY, 34);
      break;
    }
    case 'castRole': {
      const gap = 6;
      drawText(ctx, row.role, CX - gap - textWidth(row.role, 0.85), y, FG, 0.85);
      drawText(ctx, row.name, CX + gap, y, WHITE, 0.85);
      const midY = y + ROW_INK_MID;
      if (row.face) {
        drawToonFace(ctx, row.face, FACE_X, midY - FACE_BOX / 2, FACE_BOX, FACE_BOX);
      } else if (row.prop) {
        const pw = row.propW, ph = row.propH;
        const frame = Math.floor(t * propFps(row.prop)) % propFrames(row.prop);
        drawProp(ctx, row.prop, FACE_X + (FACE_BOX - pw) / 2, midY - ph / 2, pw, ph, frame);
      }
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
    case 'bigHeader': drawTextCentered(ctx, row.text, CX, y, PINK, row.scale, 'title'); break;
    case 'wall': {
      const colW = (W - 28) / HR_WALL_COLS;
      HR_WALL.forEach((n, i) => {
        const col = i % HR_WALL_COLS;
        const line = Math.floor(i / HR_WALL_COLS);
        drawText(ctx, n, 14 + col * colW, y + line * HR_WALL_ROW_H, FG, HR_WALL_SCALE);
      });
      break;
    }
    case 'rated': drawRatedBox(ctx, CX, y); break;
    case 'socket': drawSocket(ctx, CX, y + 17, t); break;
    default: break;
  }
}

export class CreditsState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() {
    this.t = 0;
    this.atRest = false;
    this.script = layoutCredits();
    this.restT = Math.max(0, (H + this.script.lastY - REST_Y) / SCROLL_SPEED);
    Audio.setBank(MEGAMIX_THEME);
    Input.setMenuButtons();
  }
  exit() { Audio.setBank(null); }
  update(dt) {
    // Hold an arrow to scrub. Forward runs at 1+SCRUB_RATE, back at
    // 1-SCRUB_RATE, so rewind is a touch slower than fast-forward — the crawl
    // is being read, and overshooting backwards past the thing you wanted is
    // more annoying than creeping up on it.
    let rate = 1;
    if (Input.held('right') || Input.held('down')) rate += SCRUB_RATE;
    if (Input.held('left') || Input.held('up')) rate -= SCRUB_RATE;
    this.scrubbing = rate !== 1;
    this.t = Math.min(this.restT, Math.max(0, this.t + dt * rate));
    this.atRest = this.t >= this.restT;
    if (this.t > OPEN_GUARD_T && (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('pointer'))) {
      Audio.sfx('ui');
      this.onDone();
      Input.endFrame();
      return;
    }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const scrollY = H - this.t * SCROLL_SPEED;
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
    const s = 0.75;
    // "TAP TO BACK" is not a sentence — touch and keyboard need different words
    // for the same idea, so they get their own pair rather than sharing a verb.
    const touch = Input.isTouchDevice();
    const exit = touch
      ? (this.atRest ? 'TAP TO RETURN' : 'TAP TO SKIP')
      : `${Input.confirmVerb()} / ESC: ${this.atRest ? 'BACK' : 'SKIP'}`;
    if (!touch) {
      drawText(ctx, '← → HOLD TO SCRUB', 8, H - 11, this.scrubbing ? GOLD : DIM, s, 'ui', UI_PLATE);
    }
    drawText(ctx, exit, W - 8 - textWidth(exit, s), H - 11, DIM, s, 'ui', UI_PLATE);
  }
}
