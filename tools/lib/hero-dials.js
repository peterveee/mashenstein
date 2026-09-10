// The body editor's single manifest. Keep this dependency-free: it is loaded by
// Node's source writer and bundled into the browser page. Every exposed numeric
// control names the renderer key it owns, its applicability, and its plain-
// language help so the UI and tests cannot drift apart.
export const BODY_GROUPS = [
  { key: 'scale', label: 'BODY SIZE' },
  { key: 'torso', label: 'TORSO & SHOULDERS' },
  { key: 'arms', label: 'ARMS' },
  { key: 'hip', label: 'HIPS & JOINS' },
  { key: 'legs', label: 'LEGS' },
];
export const BODY_SHAPES = [
  { value: 'round', label: 'Round', help: 'A rounded torso with hip tuck and hip round controls.' },
  { value: 'tapered', label: 'Tapered', help: 'A torso that narrows toward the waist with waist and shoulder-corner controls.' },
];
export const HERO_DIALS = [
  { key: 'tall', label: 'height', group: 'scale', kind: 'number', min: 0.85, max: 1.2, step: 0.01, default: 1, help: 'Makes the body taller or shorter. The head keeps its size.' },
  { key: 'torsoLong', label: 'torso length', group: 'torso', kind: 'number', min: -0.03, max: 0.1, step: 0.005, default: 0, help: 'Adds or removes space between the hips and shoulders.' },
  { key: 'torsoDrop', label: 'body over leg', group: 'torso', kind: 'number', min: -0.02, max: 0.1, step: 0.005, default: 0, help: 'Extends the bottom of the torso over the tops of the legs.' },
  { key: 'torsoWidth', label: 'shoulder width', group: 'torso', kind: 'number', min: 0.8, max: 1.2, step: 0.01, default: 1, help: 'Makes the torso broader or narrower across the shoulders.' },
  { key: 'taper', label: 'waist taper', group: 'torso', kind: 'number', min: 0.5, max: 1, step: 0.01, default: null, help: 'Controls how much a tapered torso narrows toward the waist. Round bodies leave this unset.', shape: 'tapered' },
  { key: 'waistScale', label: 'waist', group: 'torso', kind: 'number', min: 0.7, max: 1.3, step: 0.01, default: 1, help: 'Makes a tapered waist wider or narrower without changing the shoulders.', shape: 'tapered' },
  { key: 'shoulderSoft', label: 'shoulder corner', group: 'torso', kind: 'number', min: 0, max: 1, step: 0.05, default: null, help: 'Rounds the top corners of a tapered torso. Higher values soften them.', shape: 'tapered' },
  { key: 'armLength', label: 'arm length', group: 'arms', kind: 'number', min: 0.8, max: 1.2, step: 0.01, default: 1, help: 'Makes both arms longer or shorter. Hands and held items follow the existing action.' },
  { key: 'armWidth', label: 'arm width', group: 'arms', kind: 'number', min: 0.8, max: 1.25, step: 0.01, default: 1, help: 'Makes both arms thicker or thinner while preserving their movement.' },
  { key: 'armLift', label: 'shoulder height', group: 'arms', kind: 'number', min: -0.03, max: 0.04, step: 0.005, default: 0, help: 'Moves both arm attachment points up or down the body.' },
  { key: 'armOut', label: 'shoulder spread', group: 'arms', kind: 'number', min: -0.02, max: 0.04, step: 0.005, default: 0, help: 'Moves both arm attachment points outward or inward.' },
  { key: 'hipTuck', label: 'hip tuck', group: 'hip', kind: 'number', min: 0.6, max: 1.2, step: 0.02, default: 1, help: 'Changes the width of the bottom of a round torso. Lower values pull it inward.', shape: 'round' },
  { key: 'hipRound', label: 'hip round', group: 'hip', kind: 'number', min: 0, max: 1, step: 0.05, default: 0, help: 'Makes the bottom corners of a round torso more curved.', shape: 'round' },
  { key: 'hipJoin', label: 'thigh join', group: 'hip', kind: 'enum', values: ['now', 'flush'], default: 'now', help: 'Chooses how the tops of the thighs meet the body.' },
  { key: 'hipUnderside', label: 'underside line', group: 'hip', kind: 'enum', values: [1, -1, 0], default: 1, help: 'Chooses which edge of a flush thigh join is outlined.', needs: 'flush' },
  { key: 'legLength', label: 'leg length', group: 'legs', kind: 'number', min: 0.85, max: 1.2, step: 0.01, default: 1, help: 'Makes both legs longer or shorter.' },
  { key: 'legWidth', label: 'leg width', group: 'legs', kind: 'number', min: 0.8, max: 1.3, step: 0.01, default: 1, help: 'Makes both legs thicker or thinner.' },
  { key: 'legInto', label: 'leg into body', group: 'legs', kind: 'number', min: -0.02, max: 0.08, step: 0.005, default: 0, help: 'Moves the tops of the legs farther into the torso.' },
  { key: 'legShiftFoot', label: 'near leg back', group: 'legs', kind: 'number', min: -0.15, max: 0.05, step: 0.005, default: 0, needs: 'styled', help: 'Moves the near foot backward or forward in run and jump.' },
  { key: 'legShiftRoot', label: 'near hip back', group: 'hip', kind: 'number', min: -0.15, max: 0.05, step: 0.005, default: 0, needs: 'styled', help: 'Moves the near leg attachment backward or forward in run and jump.' },
];

export const EDITOR_HELP = Object.freeze({
  pose: 'Choose a movement to inspect. The body controls update every supported pose.',
  attack: 'Preview this character’s supported attack from preparation through release and recovery.',
  action: 'Choose which existing attack to preview when the character has more than one.',
  play: 'Play or pause the selected preview without changing any saved setting.',
  speed: 'Change preview speed only. It does not change the character’s animation.',
  timeline: 'Drag to inspect an exact moment. Original and edited previews stay on the same moment.',
  facing: 'Turn the preview left or right to check both sides.',
  ghost: 'Show a faint copy of the saved character behind the edited preview.',
  hideSkirt: 'Temporarily hide skirts on the slide only so the legs are easier to inspect. Never saved.',
  landmarks: 'Show the draggable body markers. Use sliders for precise values.',
  bounds: 'Show the preview frame. This is separate from gameplay collision size.',
  zoom: 'Enlarge or reduce the preview evenly in both directions.',
  fit: 'Return to a stable view that keeps the selected animation inside the frame.',
});

export const BODY_SHAPE_DEFAULT = 'round';

export function bodyShapeOf(spec) {
  return spec?.taper ? 'tapered' : 'round';
}

export function dialApplicability(row, spec, context = {}) {
  if (row.shape && row.shape !== bodyShapeOf(spec)) return { active: false, reason: `only available for ${row.shape} bodies` };
  if (row.needs === 'flush' && spec?.hipJoin !== 'flush') return { active: false, reason: 'choose Flush thigh join first' };
  if (row.needs === 'styled' && !['run', 'jump', 'attack'].includes(context.mode)) return { active: false, reason: 'available in run, jump, or attack' };
  return { active: true, reason: '' };
}

export const HUMANOIDS = ['lorenzo', 'gnash', 'rusty', 'fernwick', 'b33p', 'kiko', 'clara', 'gary', 'dolores', 'grumpos'];
export const CAST = [...HUMANOIDS];
export const EDITOR_BLOCK_HEADER = '// proportions — written by the character editor (tools/character-editor.js)';
export const EDITOR_BLOCK_END = '// end character editor proportions';
export const SPEC_HOMES = {
  '*': { file: 'src/sprites/toons.js', anchor: /export const TOON_SPECS\s*=\s*\{/, entry: (id) => id },
};

export const dialByKey = (key) => HERO_DIALS.find((row) => row.key === key) || null;

export function clampDial(row, value) {
  if (value === null && row.default === null) return null;
  if (row.kind === 'enum') {
    if (!row.values.some((v) => Object.is(v, value))) throw new Error(`${row.key} must be one of ${row.values.join(', ')}`);
    return value;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${row.key} must be a finite number`);
  const clamped = Math.min(row.max, Math.max(row.min, value));
  const steps = Math.round((clamped - row.min) / row.step);
  const snapped = row.min + steps * row.step;
  return Number(snapped.toFixed(8));
}

export function isDefault(row, value) {
  return Object.is(value, row.default);
}

export function operationFor(key, value) {
  const row = dialByKey(key);
  if (!row) throw new Error(`unknown body dial: ${key}`);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (!['set', 'inherit', 'unset'].includes(value.op)) throw new Error(`${key} has an unknown operation`);
    if (value.op !== 'set') return { op: value.op };
    return { op: 'set', value: clampDial(row, value.value) };
  }
  return { op: 'set', value: clampDial(row, value) };
}
