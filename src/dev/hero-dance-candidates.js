// Review-only choreography. Beat is a continuous quarter-note song position,
// not elapsed wall time: a future Banger Lab caller can pass its heard-song beat.
import { drawToon } from '../sprites/toons.js';

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
export const HERO_DANCE_CANDIDATES = Object.entries(choices).flatMap(([hero, moves]) =>
  moves.map(([name, move], i) => ({ hero, name, move, footwork: footwork[hero][i],
    id: `${hero}-${'ABC'[i]}`, letter: 'ABC'[i],
    description: move === 'fever-point' ? descriptions[move]
      : `${descriptions[move]} Legs: ${legNotes[footwork[hero][i]]}` })));

const TAU = Math.PI * 2;
export function heroDancePose(candidate, beat) {
  const b = Number.isFinite(beat) ? ((beat % 8) + 8) % 8 : 0;
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
  const s = Math.sin(b * Math.PI), c = Math.cos(b * Math.PI);
  const pulse = (1 - Math.cos(b * TAU)) / 2;
  const light = candidate.hero === 'rusty' ? 1.22 : candidate.hero === 'grumpos' ? 0.7 : 1;
  let hands = [[0.45 + 0.2 * s, 0.35 - 0.25 * c], [0.45 - 0.2 * s, 0.35 + 0.25 * c]];
  let feet = [[0.1 + 0.035 * s, -0.035 * Math.max(0, s)], [-0.1 + 0.035 * s, -0.035 * Math.max(0, -s)]];
  let shift = 0.018 * s, tilt = 0.018 * s, bounce = 0.012 * pulse;
  let poseTime = b / 2, headTurn = 0;
  let pointAngle = null;
  let shoulderLift = 0;
  switch (candidate.move) {
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
  return {
    kind: 'stand', time: poseTime, phase: b / 2 % 1, grounded: true, headTurn,
    facing: 1, squash: 0, lean: 0, faceJoy: true,
    dance: { hands, feet, ankles, pointAngle, shoulderLift }, shift: shift * light, tilt: tilt * light, bounce: bounce * light,
  };
}

export function drawHeroDance(ctx, candidate, beat, x, feetY, height) {
  const pose = heroDancePose(candidate, beat);
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
