// Review-only choreography. Beat is a continuous quarter-note song position,
// not elapsed wall time: a future Banger Lab caller can pass its heard-song beat.
import { drawToon } from '../sprites/toons.js';
import { groundDanceFeet, tameSkirt } from '../game/banger/dance-legs.js';

const choices = {
  lorenzo: [['Pipework Two-step', 'groove'], ['Saturday Night Plumber', 'fever-point'], ['Overtime Shuffle', 'shuffle']],
  rusty: [['Red Panda Skank', 'shuffle'], ['Tailwind Wave', 'wave'], ['Sugar-rush Pump', 'pump']],
  fernwick: [['Thyme Step', 'sway'], ['Woodland Disco', 'disco'], ['Quest Complete', 'wave']],
  b33p: [['The Robot', 'robot'], ['Low-on-cyan Slide', 'shuffle'], ['Firmware Funk', 'pump']],
  clara: [['Vault Vogue', 'disco'], ['Cliffhanger Step', 'groove'], ['Serial Swivel', 'sway']],
  kiko: [['Warning-shot Wave', 'wave'], ['Jurisdiction Jack', 'pump'], ['Side-step Authority', 'shuffle']],
  ramon: [['Phantom Pop', 'robot'], ['Orbiting Gloves', 'wave'], ['No-leg Shuffle', 'shuffle']],
  grumpos: [['Dad at the Rave', 'groove'], ['Heavy Metal Stomp', 'stomp'], ['Beard Bounce', 'pump']],
};
const descriptions = {
  groove: 'Low elbows and relaxed alternating arm swings.',
  disco: 'One hand points high while the other sits low; swap every two beats.',
  'fever-point': 'Raise the arm and hold for one full bar (four beats), then return to the shuffle for the next bar.',
  shuffle: 'Counter-swinging hands with a quick alternating rhythm.',
  wave: 'A rolling hand-to-hand wave over four beats.',
  pump: 'Both fists drive upward on each beat.',
  sway: 'Wide, unhurried arm sweeps over two beats.',
  robot: 'Stop-start arm locks, isolated head turns and planted heel switches on the half-beats.',
  stomp: 'Heavy alternating foot lifts with low, wide fists.',
};
const footwork = {
  lorenzo: ['heel-taps', 'planted', 'kicks'],
  rusty: ['running-man', 'toe-taps', 'hops'],
  fernwick: ['heel-taps', 'planted', 'knee-lifts'],
  b33p: ['locks', 'heel-taps', 'hops'],
  clara: ['planted', 'knee-lifts', 'toe-taps'],
  kiko: ['toe-taps', 'hops', 'kicks'],
  ramon: ['locks', 'orbit', 'running-man'],
  grumpos: ['heel-taps', 'stomps', 'knee-lifts'],
};
const legNotes = {
  'heel-taps': 'Alternating heel taps; feet stay in place.',
  'rusty-step': 'A small lifted step returns to its supporting foot.',
  'rusty-heel': 'One heel marks each beat while the other foot stays planted.',
  'rusty-hop': 'A loose two-foot lift with a soft, cushioned landing.',
  planted: 'Wide planted feet; let the upper body lead.',
  kicks: 'Alternating low kicks on the beat.',
  'running-man': 'Running-man lifts and returning feet.',
  'toe-taps': 'One supporting foot with an outward toe tap, swapping every two beats.',
  hops: 'Two-foot hops with a tucked landing.',
  'knee-lifts': 'Alternating knee lifts, marching in place.',
  locks: 'Feet hold still between mechanical heel locks.',
  orbit: 'Floating shoes circle in opposite directions.',
  stomps: 'Heavy alternating lift-and-stamp steps.',
};
// Additional signature routines. The same list feeds the gallery and club, so
// every move shown here is one the dancers can pick in a live set.
const extraMoves = {
  lorenzo: [
    { letter: 'G', name: 'Valve Twist', move: 'valve-twist', footwork: 'heel-taps', description: 'A plumber’s two-handed valve turn with a relaxed heel mark.' },
    { letter: 'H', name: 'Pipe Swing', move: 'pipe-swing', footwork: 'planted', description: 'A broad side-to-side arm swing with a planted, easy pivot.' },
    { letter: 'I', name: 'Toolbox Glide', move: 'toolbox-glide', footwork: 'toe-taps', description: 'One hand rides high while the other swings low; alternating toe taps keep it light.' },
  ],
  rusty: [
    { letter: 'F', name: 'Tailwind Flick', move: 'tailwind-flick', footwork: 'rusty-step', description: 'Loose paw flicks and a tiny lifted step let Rusty’s tail swing with the groove.' },
    { letter: 'G', name: 'Paws Up', move: 'paws-up', footwork: 'rusty-heel', description: 'A playful alternating paw raise over a steady heel mark.' },
    { letter: 'H', name: 'Branch Break', move: 'branch-break', footwork: 'running-man', description: 'A sweeping overhead arm break with a quick, returning running-man step.' },
  ],
  fernwick: [
    { letter: 'F', name: 'Leaf Fan', move: 'leaf-fan', footwork: 'heel-taps', description: 'Soft, opening arm fans flow from side to side.' },
    { letter: 'G', name: 'Acorn Turn', move: 'acorn-turn', footwork: 'planted', description: 'A small shoulder turn alternates with a tucked, proud pose.' },
    { letter: 'H', name: 'Quest Cheer', move: 'quest-cheer', footwork: 'knee-lifts', description: 'A bright two-arm cheer rises and settles with the beat.' },
  ],
  b33p: [
    { letter: 'F', name: 'Servo Pivot', move: 'servo-pivot', footwork: 'locks', description: 'Crisp arm locks and isolated head turns; B33P keeps its knees compact.' },
    { letter: 'G', name: 'Antenna Pop', move: 'antenna-pop', footwork: 'toe-taps', description: 'Both arms pop up in short signals over neat alternating toe taps.' },
    { letter: 'H', name: 'Hydraulic Glide', move: 'hydraulic-glide', footwork: 'planted', description: 'A smooth side shift with one precise arm lift and a planted stance.' },
  ],
  clara: [
    { letter: 'F', name: 'Rope Swing', move: 'rope-swing', footwork: 'heel-taps', description: 'Alternating overhead arcs, like swinging across a gap.' },
    { letter: 'G', name: 'Vault Snap', move: 'vault-snap', footwork: 'planted', description: 'A sharp diagonal reach lands in a confident, balanced pose.' },
    { letter: 'H', name: 'Spotlight', move: 'spotlight', footwork: 'knee-lifts', description: 'One hand presents the spotlight while the other frames the finish.' },
  ],
  kiko: [
    { letter: 'F', name: 'Badge Flash', move: 'badge-flash', footwork: 'toe-taps', description: 'A quick badge-side salute opens into a clear outward point.' },
    { letter: 'G', name: 'Siren Sweep', move: 'siren-sweep', footwork: 'heel-taps', description: 'Wide, clean arm sweeps travel across the beat.' },
    { letter: 'H', name: 'Justice Jive', move: 'justice-jive', footwork: 'planted', description: 'A compact shoulder bounce punctuated by alternating hand points.' },
  ],
  ramon: [
    { letter: 'F', name: 'Phantom Float', move: 'phantom-float', footwork: 'orbit', description: 'Slow floating arms and a measured head turn give Ramon a ghostly glide.' },
    { letter: 'G', name: 'Orbit Uppercut', move: 'orbit-uppercut', footwork: 'locks', description: 'Alternating glove lifts snap upward between mechanical heel locks.' },
    { letter: 'H', name: 'Ectoplasm Freeze', move: 'ectoplasm-freeze', footwork: 'planted', description: 'A rising arm wave resolves into a still, floating finish.' },
  ],
  grumpos: [
    { letter: 'F', name: 'Dad Groove', move: 'dad-groove', footwork: 'heel-taps', description: 'A laid-back shoulder roll and slow weight shift.' },
    { letter: 'G', name: 'Tuba Turn', move: 'tuba-turn', footwork: 'stomps', description: 'A gentle side turn and low, steady bounce.' },
    { letter: 'H', name: 'Beard Bounce', move: 'beard-bounce', footwork: 'knee-lifts', description: 'A soft two-beat body bounce with a relaxed head nod.' },
  ],
};
const signatureDance = (move, b) => {
  const s = Math.sin(b * Math.PI), c = Math.cos(b * Math.PI);
  const wave = Math.sin(b * Math.PI / 2), pulse = (1 - Math.cos(b * TAU)) / 2;
  // Move between two held shapes over each two-beat half phrase, rather than
  // snapping the limbs at the phrase boundary.
  const alternate = (1 - Math.cos(b * Math.PI / 2)) / 2;
  switch (move) {
    case 'valve-twist': return { hands: [[0.76, 0.05 - 0.3 * s], [0.76, 0.05 + 0.3 * s]], shift: 0.018 * s, tilt: 0.025 * s };
    case 'pipe-swing': return { hands: [[0.8, 0.12 + 0.42 * wave], [0.8, 0.12 - 0.42 * wave]], shift: 0.028 * wave, tilt: 0.04 * wave };
    case 'toolbox-glide': return { hands: [[0.84, -0.25 - 0.22 * c], [0.48, 0.38 + 0.18 * c]], shift: 0.04 * s, tilt: 0.025 * s };
    case 'tailwind-flick': return { hands: [[0.86, 0.12 - 0.36 * s], [0.5, 0.38 + 0.18 * s]], shift: 0.025 * s, tilt: 0.035 * s, bounce: 0.01 * pulse };
    case 'paws-up': return { hands: [[0.66, 0.3 - 0.78 * alternate], [0.66, -0.48 + 0.78 * alternate]], shift: 0.016 * s, tilt: 0.02 * s };
    case 'branch-break': return { hands: [[0.56, -0.22 - 0.48 * wave], [0.78, 0.25 + 0.18 * wave]], shift: 0.025 * wave, tilt: -0.03 * wave };
    case 'leaf-fan': return { hands: [[0.78, -0.1 - 0.34 * wave], [0.78, -0.1 + 0.34 * wave]], shift: 0.02 * wave, tilt: 0.028 * wave };
    case 'acorn-turn': return { hands: [[0.72, 0.2 - 0.7 * alternate], [0.72, -0.5 + 0.7 * alternate]], shift: 0.018 * s, tilt: 0.055 * (1 - 2 * alternate), headTurn: 8 * (1 - 2 * alternate) };
    case 'quest-cheer': return { hands: [[0.55, -0.2 - 0.42 * pulse], [0.55, -0.2 - 0.42 * pulse]], bounce: 0.014 * pulse, shoulderLift: 0.06 * pulse };
    case 'servo-pivot': return { hands: [[0.82, 0.38 - 0.8 * alternate], [0.55, -0.42 + 0.8 * alternate]], headTurn: 14 * s, shift: 0.012 * s };
    case 'antenna-pop': return { hands: [[0.72, 0.1 - 0.72 * pulse], [0.72, 0.1 - 0.72 * pulse]], bounce: 0.012 * pulse, shoulderLift: 0.05 * pulse };
    case 'hydraulic-glide': return { hands: [[0.9, -0.12 - 0.18 * c], [0.52, 0.25 + 0.12 * c]], shift: 0.035 * s, tilt: 0.018 * s };
    case 'rope-swing': return { hands: [[0.58, -0.22 - 0.48 * wave], [0.58, -0.22 + 0.48 * wave]], shift: 0.022 * wave, tilt: 0.025 * wave };
    case 'vault-snap': return { hands: [[0.56, 0.28 - 0.9 * alternate], [0.82, -0.62 + 0.9 * alternate]], shift: 0.018 * s, tilt: 0.035 * (1 - 2 * alternate) };
    case 'spotlight': return { hands: [[0.58, -0.56], [0.84, 0.12 + 0.16 * s]], headTurn: 10 * s, shoulderLift: 0.035 };
    case 'badge-flash': return { hands: [[0.28, 0.02 + 0.08 * s], [0.96, -0.5 + 0.32 * alternate]], headTurn: 8 * s, shift: 0.012 * s };
    case 'siren-sweep': return { hands: [[0.88, -0.12 - 0.35 * wave], [0.88, -0.12 + 0.35 * wave]], shift: 0.026 * wave, tilt: 0.025 * wave };
    case 'justice-jive': return { hands: [[0.9, 0.12 - 0.5 * alternate], [0.9, -0.38 + 0.5 * alternate]], bounce: 0.009 * pulse, tilt: 0.022 * s };
    case 'phantom-float': return { hands: [[0.68 + 0.12 * c, -0.24 - 0.18 * s], [0.68 - 0.12 * c, -0.24 + 0.18 * s]], shift: 0.018 * s, tilt: 0.018 * s, headTurn: 7 * c };
    case 'orbit-uppercut': return { hands: [[0.66, 0.08 - 0.64 * alternate], [0.66, -0.56 + 0.64 * alternate]], tilt: 0.022 * s, bounce: 0.008 * pulse };
    case 'ectoplasm-freeze': {
      const smooth = value => { const n = Math.max(0, Math.min(1, value)); return n * n * (3 - 2 * n); };
      const phrase = b % 4;
      const rise = smooth(phrase / 0.45), settle = 1 - smooth((phrase - 3.6) / 0.4);
      const eased = rise * settle;
      return { hands: [[0.7, 0.28 - 0.7 * eased], [0.7, 0.28 - 0.7 * eased]], shift: 0.012 * (1 - eased) * s, tilt: 0.025 * (1 - eased) * s, headTurn: 12 * eased };
    }
    case 'dad-groove': return { hands: [[0.54, 0.4 + 0.08 * s], [0.54, 0.4 - 0.08 * s]], shift: 0.035 * s, tilt: 0.025 * s, bounce: 0.014 * pulse };
    case 'tuba-turn': return { hands: [[0.62, 0.32 - 0.1 * c], [0.62, 0.32 + 0.1 * c]], shift: 0.03 * s, tilt: 0.06 * (1 - 2 * alternate), bounce: 0.018 * pulse };
    case 'beard-bounce': return { hands: [[0.5, 0.42], [0.5, 0.42]], headTurn: 8 * s, bounce: 0.025 * pulse, squash: 0.045 * (1 - pulse) };
    default: return null;
  }
};
export const HERO_DANCE_CANDIDATES = Object.entries(choices).flatMap(([hero, moves]) =>
  moves.map(([name, move], i) => ({ hero, name, move, footwork: footwork[hero][i],
    id: `${hero}-${'ABC'[i]}`, letter: 'ABC'[i],
    description: move === 'fever-point' ? descriptions[move]
      : `${descriptions[move]} Legs: ${legNotes[footwork[hero][i]]}` })));

const TAU = Math.PI * 2;
// The club randomizes quiet legs on skirted heroes. Show one of each in the
// gallery, through the SAME helper, instead of the retired wide-knee preview.
const skirted = new Set(['kiko', 'clara', 'fernwick', 'grumpos']);
const softerHopC = new Set(['fernwick', 'clara', 'kiko', 'rusty']);
const rustyLegs = ['rusty-step', 'rusty-heel', 'rusty-hop'];
/** Who has the MOONWALK among their moves (Peter, 6 Oct 2026: it "breaks up the monotony of
 *  everyone facing forward"): side-on, so only the heroes whose feet show — no hem over them.
 *  Not Ramon: his ray rig walks front-on, gloves out either side, and it read as a jog on the spot. */
export const MOONWALKERS = new Set(['lorenzo', 'b33p', 'rusty']);
// GRUMPOS keeps his arms at his sides for everything but A and C (Peter, 3 Oct 2026); B
// becomes one foot tapping, slowly — once every two beats; C keeps its Double Biceps, with
// the arms hanging idle between the poses.
const GRUMPOS_ARMS_DOWN = { armsAtSide: true };
const grumposPlain = (c) => (c.hero !== 'grumpos' || c.letter === 'A' || c.letter === 'C' ? c
  : c.letter === 'B' ? { ...c, ...GRUMPOS_ARMS_DOWN, move: 'slow-tap', footwork: null, labLegs: 'tap', tapEvery: 2,
    name: 'Slow Tap', description: 'Arms at his sides; one foot taps, once every two beats. Current Lab move.' }
    : { ...c, ...GRUMPOS_ARMS_DOWN, description: `${c.description} Arms at his sides.` });
const LAB_ALL = () => Object.keys(choices).flatMap(hero => {
  const current = HERO_DANCE_CANDIDATES.filter(c => c.hero === hero).map((c, i) => {
    const labLegs = skirted.has(hero) ? hero === 'grumpos' ? 'stand' : ['tap', 'stand', 'hop'][i] : null;
    if (hero === 'grumpos' && c.letter === 'C') return { ...c,
      move: 'muscle-hold', footwork: null, labLegs: 'stand', name: 'Double Biceps',
      description: 'Classic double biceps held for one full bar, then one bar relaxed. Elbows wide, fists beside the head, feet planted. Current Lab move.' };
    if (hero === 'rusty') return { ...c, footwork: rustyLegs[i],
      name: ['Pocket Step', 'Heel-down Groove', 'Soft-knee Hop'][i],
      description: ['Small lifted step and return; the supporting leg stays still.',
        'One heel marks the beat while the other foot stays planted.',
        'A loose two-foot lift with a soft, cushioned landing.'][i] + ' Current Lab move.' };
    return { ...c, labLegs, description: labLegs
      ? `${descriptions[c.move]} Club legs: ${labLegs}.` : c.description };
  });
  const taps = ['D', 'E'].map((letter, i) => ({
    hero, id: `${hero}-${letter}`, letter, move: i ? 'tap-sway' : 'tap', footwork: null,
    labLegs: 'tap', alternateTap: !!i,
    name: i ? 'Take Turns' : 'Just the Beat',
    description: i ? 'Quiet foot tap; swap the tapping foot every bar. Small arm groove. Current Lab move.'
      : 'One foot taps the beat, the other stays planted. Relaxed arms. Current Lab move.',
  }));
  // Lorenzo's is F, from before the signature routines; the others' comes after theirs, as I
  const moonwalk = MOONWALKERS.has(hero) ? [{
    hero, id: `${hero}-${hero === 'lorenzo' ? 'F' : 'I'}`, letter: hero === 'lorenzo' ? 'F' : 'I', move: 'moonwalk', footwork: null,
    name: 'Moonwalk',
    description: 'A side-on backward glide with alternating toe lifts and a smooth reset. Occasional club dance.',
  }] : [];
  const additions = extraMoves[hero].map((move, i) => {
    const labLegs = skirted.has(hero)
      ? hero === 'grumpos' ? 'stand' : ['tap', 'stand', 'hop'][i]
      : null;
    const legs = labLegs ? `Gallery legwork: ${labLegs}; the club varies quiet legs during playback.`
      : `Legs: ${legNotes[move.footwork]}`;
    return {
      hero, ...move, id: `${hero}-${move.letter}`, signature: true, labLegs,
      description: `${move.description} ${legs} Current Lab move.`,
    };
  });
  return [...current, ...taps, ...moonwalk, ...additions].sort((a, b) => a.letter.localeCompare(b.letter));
});
export const HERO_DANCE_LAB_CANDIDATES = LAB_ALL().map(grumposPlain);
export function heroDancePose(candidate, beat) {
  const pose = danceInner(candidate.move === 'slow-tap' ? { ...candidate, move: 'tap' } : candidate, beat);
  // arms hanging at the sides, out far enough from the body to be seen
  if (candidate.armsAtSide && pose.dance) {
    pose.dance = { ...pose.dance, restArms: true, pointAngle: null, shoulderLift: 0 };
    pose.armsInFront = false;
  }
  if (candidate.hero === 'b33p' && pose.dance?.feet) {
    // His knees are compact mechanical hinges, so keep the dance pose near
    // straight instead of letting the default humanoid bend bow them outward.
    pose.dance = { ...pose.dance, legSegMax: 0.43 };
  } else if (softerHopC.has(candidate.hero) && candidate.letter === 'C' && pose.dance?.feet) {
    // Their C hops keep B33P's spring, with a small foot spread. Clara gets a
    // measured landing fold, using the same hinge direction as B33P.
    const hopPhase = Number.isFinite(beat) ? ((beat % 1) + 1) % 1 : 0;
    const hopLift = Math.sin(hopPhase * Math.PI);
    pose.dance = { ...pose.dance, legSegMax: candidate.hero === 'clara' ? 0.72 : 0.45,
      ...(candidate.hero === 'clara' ? {
        hopLegFlex: 0.5 + 0.18 * (1 - hopLift), hopLandingCrouch: 0.025,
      } : {}),
      ...(skirted.has(candidate.hero) ? { hopKneeSpread: 0.02 } : {}),
    };
  }
  return groundDanceFeet(pose);
}
function danceInner(candidate, beat) {
  const b = Number.isFinite(beat) ? ((beat % 8) + 8) % 8 : 0;
  if (candidate.move === 'muscle-hold') {
    const smooth = v => { const n = Math.max(0, Math.min(1, v)); return n * n * (3 - 2 * n); };
    const hold = b < 4 ? 1 : b < 4.3 ? 1 - smooth((b - 4) / 0.3)
      : b > 7.7 ? smooth((b - 7.7) / 0.3) : 0;
    return {
      kind: 'stand', time: 0, phase: 0, grounded: true, facing: 1,
      squash: 0, lean: 0, faceJoy: true, armsInFront: hold > 0,
      shift: 0, tilt: 0, bounce: 0,
      // relaxed, the arms hang idle at his sides; posing, fists up beside the head
      dance: { restArms: hold === 0, hands: [[0.18 + 0.22 * hold, 0.95 - 1.55 * hold],
        [0.18 + 0.22 * hold, 0.95 - 1.55 * hold]], feet: null,
        ankles: [0, 0], pointAngle: null, shoulderLift: 0 },
    };
  }
  if (candidate.move === 'fever-point') {
    // One complete bar held high; one bar back in the original shuffle.
    // The short arrival is at the end of the shuffle bar, so it never eats
    // into the four-beat hold. Normal arm length and normal hand throughout.
    const base = heroDancePose({ ...candidate, move: 'shuffle', footwork: null }, b);
    const smooth = v => { const n = Math.max(0, Math.min(1, v)); return n * n * (3 - 2 * n); };
    const hold = b < 4 ? 1 : b < 4.25 ? 1 - smooth((b - 4) / 0.25)
      : b > 7.75 ? smooth((b - 7.75) / 0.25) : 0;
    const angle = -72 * Math.PI / 180;
    const blend = (from, to) => hold === 1 ? to : hold === 0 ? from
      : from.map((point, i) => point.map((n, j) => n + (to[i][j] - n) * hold));
    return {
      ...base, time: base.time * (1 - hold), headTurn: 12 * hold,
      shift: base.shift * (1 - hold), tilt: base.tilt * (1 - hold), bounce: base.bounce * (1 - hold),
      dance: {
        ...base.dance,
        // The low hand out from the hip, not hanging behind him where it could not be seen
        // (Peter, 3 Oct 2026).
        hands: blend(base.dance.hands, [[1.09 * Math.cos(angle), 1.09 * Math.sin(angle)], [0.7, 0.72]]),
        feet: blend(base.dance.feet, [[0.17, 0], [-0.17, 0]]),
        pointAngle: hold > 0 ? angle : null, shoulderLift: 0.04 * hold,
      },
    };
  }
  if (candidate.move === 'moonwalk') {
    // Keep Lorenzo's shipped walk silhouette and arm swing. The backward travel
    // comes from the root sliding beneath that familiar side-facing cycle.
    const phrase = b % 8;
    const glide = phrase < 6 ? (phrase / 6) ** 2 * (3 - 2 * phrase / 6)
      : 1 - ((phrase - 6) / 2) ** 2 * (3 - 2 * (phrase - 6) / 2);
    return {
      kind: 'run', time: b / 2, phase: (b / 2) % 1, grounded: true,
      walk: true, menu: true, facing: 1,
      shift: -0.12 * glide, tilt: 0, bounce: 0,
    };
  }
  const s = Math.sin(b * Math.PI), c = Math.cos(b * Math.PI);
  const pulse = (1 - Math.cos(b * TAU)) / 2;
  const light = candidate.hero === 'rusty' ? 1.22 : candidate.hero === 'grumpos' ? 0.7 : 1;
  let hands = [[0.45 + 0.2 * s, 0.35 - 0.25 * c], [0.45 - 0.2 * s, 0.35 + 0.25 * c]];
  let feet = [[0.1 + 0.035 * s, -0.035 * Math.max(0, s)], [-0.1 + 0.035 * s, -0.035 * Math.max(0, -s)]];
  let shift = 0.018 * s, tilt = 0.018 * s, bounce = 0.012 * pulse;
  let poseTime = b / 2, headTurn = 0;
  let pointAngle = null;
  let shoulderLift = 0;
  let squash = 0;
  switch (candidate.move) {
    case 'tap':
    case 'tap-sway':
      hands = candidate.move === 'tap' ? [[0.7, 0.8], [0.7, 0.8]]
        : [[0.7, 0.6 + 0.1 * s], [0.7, 0.6 - 0.1 * s]];
      shift = 0; tilt = 0; bounce = 0; break;
    case 'disco': {
      const reach = Math.sin(b * Math.PI / 2);
      hands = [[0.58, -0.12 - 0.72 * reach], [0.58, -0.12 + 0.72 * reach]];
      shift = 0.025 * reach; tilt = -0.035 * reach;
      break;
    }
    case 'shuffle':
      feet = [[0.12 + 0.085 * s, -0.075 * Math.max(0, c)], [-0.12 - 0.085 * s, -0.075 * Math.max(0, -c)]];
      hands = [[0.5 + 0.25 * c, 0.2 + 0.45 * s], [0.5 - 0.25 * c, 0.2 - 0.45 * s]];
      shift = 0.035 * s; break;
    case 'wave': {
      const w = b * Math.PI / 2;
      hands = [[0.65 + 0.22 * Math.cos(w), -0.22 + 0.55 * Math.sin(w)], [0.65 + 0.22 * Math.cos(w - 1.4), -0.22 + 0.55 * Math.sin(w - 1.4)]];
      tilt = 0.025 * Math.sin(w); break;
    }
    case 'pump':
      hands = [[0.32, 0.25 - pulse], [0.32, 0.25 - pulse]];
      bounce = 0.022 * pulse; break;
    case 'sway': {
      const w = Math.sin(b * Math.PI / 2);
      hands = [[0.8, 0.12 + 0.4 * w], [0.8, 0.12 - 0.4 * w]];
      shift = 0.035 * w; tilt = 0.035 * w; bounce = 0.005 * pulse; break;
    }
    case 'robot': {
      const q = b * 2, index = Math.floor(q), f = q - index;
      const ease = Math.min(1, f / 0.18);
      const e = ease * ease * (3 - 2 * ease);
      // One isolated change per lock: front arm, head, back arm, heel;
      // then the reverse. No soft sway/foot sine continues under a hold.
      const locks = [
        [0.72, -0.45, 0.72, 0.45, 0, 0],
        [0.72, -0.45, 0.72, 0.45, 30, 0],
        [0.72, -0.45, 0.72, -0.45, 30, 0],
        [0.72, -0.45, 0.72, -0.45, 30, 1],
        [0.72, 0.45, 0.72, -0.45, 30, 1],
        [0.72, 0.45, 0.72, -0.45, -30, 1],
        [0.72, 0.45, 0.72, 0.45, -30, 1],
        [0.72, 0.45, 0.72, 0.45, 0, 0],
      ];
      const from = locks[(index + 7) % 8], to = locks[index % 8];
      const v = from.map((n, i) => n + (to[i] - n) * e);
      hands = [[v[0], v[1]], [v[2], v[3]]];
      feet = [[0.12 + 0.035 * v[5], 0], [-0.12 + 0.035 * v[5], 0]];
      headTurn = v[4]; shift = 0.018 * v[5];
      // Freeze the rig's idle breath/expression clock too.
      poseTime = 0; tilt = 0; bounce = 0; break;
    }
    case 'stomp':
      feet = [[0.14, -0.1 * Math.max(0, s)], [-0.14, -0.1 * Math.max(0, -s)]];
      hands = [[0.65, 0.5 - 0.2 * s], [0.65, 0.5 + 0.2 * s]];
      bounce = 0; tilt = 0.025 * s; break;
  }
  if (candidate.hero === 'kiko') {
    // Keep the normal sleeve layering. Open hand paths keep her elbows and
    // forearms outside the torso silhouette instead of folding behind it.
    if (candidate.move === 'pump') {
      hands = [[0.94, 0.35 - 0.7 * pulse], [0.94, 0.35 - 0.7 * pulse]];
    } else if (candidate.move === 'wave') {
      const w = b * Math.PI / 2;
      hands = [[0.96 + 0.04 * Math.cos(w), 0.05 + 0.3 * Math.sin(w)],
        [0.96 + 0.04 * Math.cos(w - 1.4), 0.05 + 0.3 * Math.sin(w - 1.4)]];
    } else if (candidate.move === 'shuffle') {
      hands = [[0.96 + 0.04 * c, 0.15 + 0.25 * s], [0.96 - 0.04 * c, 0.15 - 0.25 * s]];
    }
  }
  // Lab choreography, independent of the runner's gait. Only the running-man
  // travels laterally; most moves now keep a supporting foot planted.
  const upF = Math.max(0, s), upB = Math.max(0, -s);
  let ankles = [0, 0];
  switch (candidate.footwork) {
    case 'rusty-step': {
      const f = b % 1;
      const up = Math.sin(Math.PI * f) ** 2;
      const front = Math.floor(b) % 2 === 0;
      feet = [[0.1 + (front ? 0.025 * up : 0), front ? -0.065 * up : 0],
        [-0.1 - (front ? 0 : 0.025 * up), front ? 0 : -0.065 * up]];
      ankles = [front ? -0.15 * up : 0, front ? 0 : -0.15 * up];
      shift = 0; bounce = 0; tilt = 0; break;
    }
    case 'rusty-heel': {
      const f = b % 1, up = f > 0.5 ? Math.sin((f - 0.5) * TAU) : 0;
      feet = [[0.1, -0.02 * up], [-0.1, 0]]; ankles = [-0.35 * up, 0];
      shift = 0; bounce = 0; tilt = 0; break;
    }
    case 'rusty-hop': {
      const hop = Math.sin(Math.PI * (b % 1));
      const spread = 0.1 + 0.02 * hop;
      feet = [[spread, -0.025 * hop], [-spread, -0.025 * hop]];
      bounce = 0.07 * hop; // Rusty's 1.22 motion gain brings this to B33P's 0.085.
      squash = 0.16 * (1 - hop);
      shift = 0; tilt = 0; break;
    }
    case 'planted':
      feet = [[0.17, 0], [-0.17, 0]]; shift = 0; bounce = 0; tilt = 0; break;
    case 'heel-taps':
      feet = [[0.12, -0.012 * upF], [-0.12, -0.012 * upB]];
      ankles = [-0.4 * upF, -0.4 * upB]; shift = 0; bounce = 0; tilt = 0; break;
    case 'knee-lifts':
      feet = [[0.11, -0.17 * upF], [-0.11, -0.17 * upB]];
      ankles = [0.22 * upF, 0.22 * upB]; shift = 0; bounce = 0; tilt = 0; break;
    case 'kicks':
      feet = [[0.12 + 0.12 * upF, -0.11 * upF], [-0.12 - 0.12 * upB, -0.11 * upB]];
      ankles = [-0.35 * upF, -0.35 * upB]; shift = 0; bounce = 0; tilt = 0; break;
    case 'hops': {
      const hop = Math.max(0, Math.sin((b % 1 - 0.12) / 0.88 * Math.PI));
      feet = [[0.12, -0.025 * hop], [-0.12, -0.025 * hop]];
      bounce = 0.085 * hop; shift = 0; tilt = 0; break;
    }
    case 'toe-taps': {
      const tapF = Math.floor(b / 2) % 2 === 0;
      const tap = 0.07 * pulse;
      feet = [[0.12 + (tapF ? tap : 0), 0], [-0.12 - (tapF ? 0 : tap), 0]];
      ankles = [tapF ? 0.3 * pulse : 0, tapF ? 0 : 0.3 * pulse];
      shift = 0; bounce = 0; tilt = 0; break;
    }
    case 'running-man':
      feet = [[0.1 + 0.085 * c, -0.15 * upF], [-0.1 - 0.085 * c, -0.15 * upB]];
      ankles = [0.25 * upF, 0.25 * upB]; shift = 0; bounce = 0; tilt = 0; break;
    case 'stomps': {
      const step = b % 1, lift = Math.sin(Math.PI * Math.min(1, step / 0.7));
      const front = Math.floor(b) % 2 === 0;
      feet = [[0.15, front ? -0.14 * lift : 0], [-0.15, front ? 0 : -0.14 * lift]];
      shift = 0; bounce = 0; tilt = 0; break;
    }
    case 'locks': {
      const lock = (feet[0][0] - 0.12) / 0.035;
      ankles = [-0.3 * lock, -0.3 * (1 - lock)];
      feet = [[0.12, 0], [-0.12, 0]]; shift = 0; break;
    }
    case 'orbit':
      feet = [[0.14 + 0.07 * c, -0.07 - 0.06 * s], [-0.14 - 0.07 * c, -0.07 + 0.06 * s]];
      ankles = [0.3 * s, -0.3 * s]; shift = 0; bounce = 0; tilt = 0; break;
  }
  const signature = candidate.signature ? signatureDance(candidate.move, b) : null;
  if (signature) {
    hands = signature.hands;
    if (signature.shift !== undefined) shift = signature.shift;
    if (signature.tilt !== undefined) tilt = signature.tilt;
    if (signature.bounce !== undefined) bounce = signature.bounce;
    if (signature.squash !== undefined) squash = signature.squash;
    if (signature.headTurn !== undefined) headTurn = signature.headTurn;
    if (signature.shoulderLift !== undefined) shoulderLift = signature.shoulderLift;
  }
  return {
    kind: 'stand', time: poseTime, phase: b / 2 % 1, grounded: true, headTurn,
    facing: 1, squash, lean: 0, faceJoy: true,
    dance: { hands, feet, ankles, pointAngle, shoulderLift,
      legFlex: 0.48 },
    shift: shift * light, tilt: tilt * light, bounce: bounce * light,
  };
}

export function drawHeroDance(ctx, candidate, beat, x, feetY, height) {
  let pose = heroDancePose(candidate, beat);
  if (candidate.labLegs) {
    pose = tameSkirt(pose, candidate.labLegs, beat / (candidate.tapEvery || 1));
    if (candidate.alternateTap && Math.floor(beat / 4) % 2 === 1) {
      pose.dance.feet = pose.dance.feet.slice().reverse().map(([x, y]) => [-x, y]);
      pose.dance.ankles = pose.dance.ankles.slice().reverse();
    }
  }
  ctx.save();
  ctx.translate(x + pose.shift * height, feetY - pose.bounce * height);
  ctx.rotate(pose.tilt);
  drawToon(ctx, candidate.hero, pose, 0, 0, height);
  ctx.restore();
}

export function drawHeroDanceCard(ctx, candidate, beat) {
  const w = 240, h = 176;
  ctx.fillStyle = '#101727'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1c2940'; ctx.fillRect(8, 28, 144, 130);
  ctx.fillStyle = '#151f32'; ctx.fillRect(159, 28, 73, 130);
  ctx.font = '9px monospace'; ctx.fillStyle = '#9baeca';
  ctx.fillText('MOVE ' + candidate.letter + ' / ' + candidate.move.toUpperCase(), 12, 17);
  ctx.fillText('CLOSE-UP', 14, 42); ctx.fillText('LAB SIZE', 171, 42);
  const floor = 144;
  ctx.strokeStyle = '#42617c'; ctx.beginPath();
  ctx.moveTo(15, floor); ctx.lineTo(145, floor); ctx.moveTo(165, floor); ctx.lineTo(226, floor); ctx.stroke();
  drawHeroDance(ctx, candidate, beat, 80, floor, 86);
  drawHeroDance(ctx, candidate, beat, 194, floor, 28);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = Math.floor(beat % 4) === i ? '#7df3d1' : '#334358';
    ctx.fillRect(83 + i * 20, 163, 14, 4);
  }
}
