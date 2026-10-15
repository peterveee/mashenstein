// The lane obstacles picked on 15 Oct 2026 from the 12 Oct per-cabinet bake-offs
// (Field Service, Speed Zone, Frost Fortress, Crypt Shift), gathered into the
// same tables officeProps.js and gravityProps.js hand sprites/props.js. Each
// cabinet's painters live in its own module (sprites/<cabinet>Props.js); boxes
// and flags are in game/entities.js, and data/cabinets.js deals them.
import { outlined } from './outline.js';
import { PLUMBER_PROP_SPECS } from './plumberProps.js';
import { SPEED_PROP_SPECS } from './speedProps.js';
import { FROST_PROP_SPECS } from './frostProps.js';
import { CRYPT_PROP_SPECS } from './cryptProps.js';

const SPECS = { ...PLUMBER_PROP_SPECS, ...SPEED_PROP_SPECS, ...FROST_PROP_SPECS, ...CRYPT_PROP_SPECS };

// The painted envelope a painter is authored in, in world units.
export function cabinetPropEnvelope(name) {
  const s = SPECS[name];
  const vis = s.visual || 1;
  return { w: Math.round(s.box[0] * 4 / 3 * vis), h: Math.round(s.box[1] * 4 / 3 * (s.tall || 1) * vis) };
}

export const CABINET_PROP_NAMES = Object.keys(SPECS);
export const CABINET_PROP_PAINTERS = {};
export const CABINET_PROP_FRAMES = {};
export const CABINET_PROP_FPS = {};
export const CABINET_PROP_TALL = {};
export const CABINET_PROP_VISUAL = {};
export const CABINET_PROP_DETAIL = {};
for (const [name, s] of Object.entries(SPECS)) {
  const env = cabinetPropEnvelope(name);
  const n = s.frames || 1;
  CABINET_PROP_PAINTERS[name] = outlined((ctx, w, h, frame = 0) => {
    ctx.save();
    ctx.scale(w / env.w, h / env.h);
    s.paint(ctx, env.w, env.h, (((Math.floor(frame) % n) + n) % n) / s.fps);
    ctx.restore();
  });
  if (n > 1) { CABINET_PROP_FRAMES[name] = n; CABINET_PROP_FPS[name] = s.fps; }
  if (s.tall && s.tall !== 1) CABINET_PROP_TALL[name] = s.tall;
  if (s.visual) CABINET_PROP_VISUAL[name] = s.visual;
  CABINET_PROP_DETAIL[name] = 2;
}
