// Fake AAA end-credits crawl. Dev-menu only for now (see 'CREDITS' under
// SCENES in src/dev/menus.js) — there is no production route to it yet.
// Content is a stylised in-game excerpt of CREDITS.md at the repo root; the
// two are hand-kept in sync, this file does not render the markdown file.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawText, drawTextCentered, textWidth, wrapText } from '../engine/sprites.js';
import { MEGAMIX_THEME } from '../data/megamix.js';

const GOLD = '#f6d33c';
const CYAN = '#48e0c8';
const PINK = '#f890b8';
const DIM = '#5a5a68';
const FG = '#c8c8d8';
const WHITE = '#ffffff';

const CX = W / 2;
const BODY_W = W - 64;
// Slow enough to read a role/name pair per second, fast enough that the whole
// joke doesn't outstay the track it's borrowed. SKIP is always one tap away.
const SCROLL_SPEED = 30;
// Guards the same confirm/tap press that opened this screen from the dev menu
// from also being read as "skip" on the first frame.
const OPEN_GUARD_T = 0.3;

// ---- content, declared top to bottom in the order it scrolls -------------
const SCRIPT = [
  { k: 'title', text: 'MASHENSTEIN: THE UNPLUGGENING' },
  { k: 'title2', text: 'END CREDITS' },
  { k: 'gap', px: 18 },
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
  { k: 'handoff', a: 'DIRECTION', b: 'PRODUCTION', lineA: 'Your turn.', lineB: 'I have filed a form about that.' },
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
  { k: 'handoff', a: 'NARRATIVE', b: 'ENGINEERING', lineA: 'Your turn.', lineB: "We don't do turns. We do tickets." },
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
  { k: 'handoff', a: 'AUDIO', b: 'CAST', lineA: 'Your turn.', lineB: 'POYO.' },
  { k: 'gap', px: 16 },

  { k: 'header', text: 'STARRING', color: GOLD },
  { k: 'role', role: 'Lorenzo "Wrenches" Bracciano', name: '"Big Sal" Marchetti, Local 4, Certified' },
  { k: 'role', role: 'Gnash the Needlemouse', name: 'credited as Already Left' },
  { k: 'role', role: 'Fernwick, Hero of Thyme', name: 'a grocery receipt, itself' },
  { k: 'role', role: 'Unit B-33P "Blastbot"', name: 'voice grievance filed on his behalf' },
  { k: 'role', role: 'Mochi', name: '"POYO" performed by Mochi' },
  { k: 'role', role: 'Miss Chomp', name: 'appetite consultant credited separately' },
  { k: 'role', role: "Ray M'n, Appendage-Optional", name: 'limbs performed by stunt limbs, insured separately' },
  { k: 'role', role: 'Grumpos, Dad of Boy', name: '"BOY" performed with range' },
  { k: 'role', role: 'Don K. Eggshell, PhD', name: 'played by himself, thesis on request' },
  { k: 'role', role: 'Gary', name: 'played by Gary (deceased)' },
  { k: 'role', role: 'Dolores', name: 'played by Dolores, still on shift' },
  { k: 'role', role: 'Dust Devil 9000', name: 'plays itself, apologizes in advance' },
  { k: 'role', role: 'The Turtle (TURDLE)', name: 'himself, in a borrowed shell' },
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
  { k: 'gap', px: 14 },
  { k: 'handoff', a: 'LOCALIZATION', b: 'HUMAN RESOURCES', lineA: 'Your turn.', lineB: "We're going to need that in writing." },
  { k: 'gap', px: 16 },

  { k: 'header', text: 'HUMAN RESOURCES, COMPLIANCE & LEGAL' },
  { k: 'role', role: 'Director of Human Resources', name: 'Beauregard Finch' },
  { k: 'role', role: 'Employee Relations, Deceased Staff Division', name: 'Corinne Achebe' },
  { k: 'role', role: 'Forms & Grievance Processing', name: 'an entire uncredited department' },
  { k: 'role', role: 'Risk, Liability & Appliance Safety', name: 'Dagny Holm' },
  { k: 'role', role: 'General Counsel', name: 'Percival Wrenfield, Esq.' },
  { k: 'role', role: 'Outside Counsel for Don K. Eggshell, PhD', name: 'Marchetti, Ohm & Fuse LLP' },
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
  { k: 'note', text: 'RATED E — FOR EVERYONE WHO CAN FILE A FORM IN TRIPLICATE', color: GOLD },
  { k: 'note', text: 'Mild Cartoon Violence · Comic Bureaucracy · Sustained Appliance Peril' },
  { k: 'gap', px: 18 },
  { k: 'sub', text: 'A GENERAL APPLIANCE HOLDINGS RELEASE' },
  { k: 'gap', px: 44 },

  { k: 'sub', text: 'THE LED BLINKS TWICE. THE SOCKET STAYS LIT.', color: CYAN },
  { k: 'gap', px: 10 },
  { k: 'title2', text: 'DON K. EGGSHELL, PHD WILL RETURN IN:' },
  { k: 'title2', text: 'A GRIEVANCE, ITEMIZED.' },
  { k: 'gap', px: 10 },
  { k: 'note', text: 'A form is already being filed about this sequel.' },
  { k: 'gap', px: 70 },
];

function layoutCredits() {
  const rows = [];
  let y = 0;
  const push = (row, h) => { rows.push({ ...row, y }); y += h; };
  for (const item of SCRIPT) {
    switch (item.k) {
      case 'gap': y += item.px; break;
      case 'title': push(item, 26); break;
      case 'title2': push(item, 18); break;
      case 'sub': push(item, 15); break;
      case 'note': push(item, 12); break;
      case 'header': push(item, 18); break;
      case 'role': push(item, 13); break;
      case 'handoff':
        push({ k: 'handoffLabel', text: `[ RELAY HANDOFF: ${item.a} → ${item.b} ]` }, 13);
        push({ k: 'handoffLine', text: `${item.a}: "${item.lineA}"` }, 12);
        push({ k: 'handoffLine', text: `${item.b}: "${item.lineB}"` }, 12);
        break;
      case 'para':
        for (const line of wrapText(item.text, BODY_W, 0.85, 60, 'ui')) push({ k: 'note', text: line, color: DIM, scale: 0.85 }, 11);
        break;
      default: break;
    }
  }
  return { rows, total: y };
}

function drawRow(ctx, row, y) {
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
    case 'handoffLabel': drawTextCentered(ctx, row.text, CX, y, GOLD, 0.85); break;
    case 'handoffLine': drawTextCentered(ctx, row.text, CX, y, CYAN, 0.85); break;
    default: break;
  }
}

export class CreditsState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() {
    this.t = 0;
    this.script = layoutCredits();
    Audio.setBank(MEGAMIX_THEME);
    Input.setMenuButtons();
  }
  exit() { Audio.setBank(null); }
  update(dt) {
    this.t += dt;
    if (this.t > OPEN_GUARD_T && (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('pointer'))) {
      Audio.sfx('ui');
      this.onDone();
      Input.endFrame();
      return;
    }
    // Auto-return once the whole crawl has scrolled off the top, same as the
    // cast roll call reaching its last card.
    if (H - this.t * SCROLL_SPEED + this.script.total < -20) {
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
      if (y < -16 || y > H + 16) continue;
      drawRow(ctx, row, y);
    }
    ctx.fillStyle = 'rgba(11,11,20,0.78)';
    ctx.fillRect(0, H - 18, W, 18);
    drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP TO SKIP' : `${Input.confirmVerb()} / ESC: SKIP`, CX, H - 14, DIM);
  }
}
