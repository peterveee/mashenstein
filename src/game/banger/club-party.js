// Occasional club theatre, driven by the heard beat. No audio or input effects.
import { drawToon } from '../../sprites/toons.js';
import { drawProp } from '../../sprites/props.js';
import { HERO_DANCE_LAB_CANDIDATES, heroDancePose } from '../../dev/hero-dance-candidates.js';
import { groundDanceFeet } from './dance-legs.js';

export const PARTY_BEATS = Object.freeze({ spotlight: 8, bubbles: 16, cleaner: 16, vacuum: 16, 'drop-jump': 5 });
/** How many beats the crowd takes to sink all the way down while Fernwick draws. */
export const DRAW_CROUCH_BEATS = 4;
/** The two who come for the confetti on the floor: Dolores with her broom, or the game's vacuum cleaner. */
export const CLEANERS = Object.freeze(['cleaner', 'vacuum']);
/**
 * The line the cleaners walk, and the confetti pools along: well in front of the heroes' feet
 * so they block the cast less (Peter, 3 Oct 2026), kept clear of the bottom edge.
 */
export const cleanerFloor = (floorRef, toonH, stageBot, u) => Math.min(stageBot - 7 * u, floorRef + toonH * 0.58);
/**
 * THE TURBO HOOVER (Peter, 5 Oct 2026): the vacuum tapped tears off across the rest of the floor in
 * VACUUM_TURBO_BEATS or a little more, straight, shaking, sucking in everything for a good way ahead
 * of it — then blows up out of the far side on a beat (club.js tapVacuum). `m.turbo` is { from
 * (beats of the moment's age), p0, beats (how long it runs: to the beat it blows up on) }.
 */
export const VACUUM_TURBO_BEATS = 3;
/** How far across the vacuum has got (0–1 past the far edge), and how far into its turbo (0–1, or null). */
export function vacuumWalk(m, beat) {
  const age = partyAge(m, beat);
  if (!m.turbo || age < m.turbo.from) return { progress: age / m.beats, turbo: null };
  const k = Math.min(1, (age - m.turbo.from) / (m.turbo.beats || VACUUM_TURBO_BEATS));
  return { progress: m.turbo.p0 + (1 - m.turbo.p0) * k * k, turbo: k };
}
/**
 * Where a scrap of confetti lies: `dy` of the way down the floor in front of the heroes' feet, to
 * just inside the bottom of the picture — spread over what there is of it, never piled along the
 * bottom edge in a line (a short landscape floor clipped two in five of them to it).
 */
export const scrapY = (floorRef, toonH, stageBot, u, dy) => {
  const top = floorRef + toonH * 0.2, bottom = Math.min(stageBot - 5 * u, floorRef + toonH * 0.92);
  return bottom > top ? top + (bottom - top) * dy : Math.min(stageBot - 3 * u, top);
};

/**
 * THE CONFETTI ON THE FLOOR (Peter, 5 Oct 2026: "can we improve the look of the confetti on the
 * floor"): each scrap a little paper shape dropped flat at its own angle — mostly strips, some
 * squares, punched dots, and curls standing up off the tiles — foreshortened as the floor is and
 * smaller further back, showing its bright face or its darker back, with a contact shadow so it
 * lies ON the floor; the odd foil one winks on the beat.
 */
const SCRAP_SHAPES = Object.freeze(['strip', 'strip', 'strip', 'strip', 'square', 'dot', 'curl']);
const FLAT = 0.5;   // how much the floor squashes what lies on it
const frac = (v) => v - Math.floor(v);
/** A scrap of confetti for the floor: `x` across, `dy` of the way down the floor, landing at `at`. */
export function makeScrap(x, dy, colour, at, rnd = Math.random) {
  return { x, dy, colour, at, shape: SCRAP_SHAPES[Math.floor(rnd() * SCRAP_SHAPES.length)], a: rnd() * Math.PI,
    s: 0.75 + rnd() * 0.5, back: rnd() < 0.4, foil: rnd() < 0.14 };
}
/** A scrap's look — made up once from where it lies, if it was dropped without one. */
function scrapLook(sc) {
  if (!sc.shape) {
    let n = 0;
    Object.assign(sc, makeScrap(sc.x, sc.dy, sc.colour, sc.at, () => frac(Math.sin((sc.x + sc.dy * 31.7) * 12.9898 + ++n * 78.233) * 43758.5453)));
  }
  return sc;
}
const tones = new Map();
/** `hex` darkened (k < 1) or taken toward white (k > 1), as an rgb() string, worked out once. */
function tone(hex, k) {
  const key = hex + k;
  if (!tones.has(key)) {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    tones.set(key, `rgb(${c.map((v) => Math.round(k <= 1 ? v * k : v + (255 - v) * (k - 1))).join(',')})`);
  }
  return tones.get(key);
}
const traceScrap = (ctx, g, oy = 0) => {
  if (g.dot) { ctx.moveTo(g.x + g.rx, g.y + oy); ctx.ellipse(g.x, g.y + oy, g.rx, g.ry, 0, 0, Math.PI * 2); return; }
  const p = g.p;
  ctx.moveTo(p[0], p[1] + oy);
  for (let i = 2; i < 8; i += 2) ctx.lineTo(p[i], p[i + 1] + oy);
  ctx.closePath();
};
/**
 * Scraps on the floor — [{ sc, x, y, scale?, alpha? }] — drawn a fill a colour, the way the
 * mirror ball batches its tiles: a hundred and thirty little paths a frame, a dozen fills.
 * `glint` is the beat (1 on it, falling away). `hop(sc)`, while the floor shakes (club.js
 * scrapHop), is how high a scrap is bouncing and how far it has turned — [px, radians]; its
 * shadow stays on the floor under it.
 */
export function drawScraps(ctx, items, u, { glint = 0, lite = false, hop = null } = {}) {
  if (!items.length) return;
  const fills = new Map(), curls = new Map(), shadows = [], shine = [];
  const put = (map, key, g) => { const l = map.get(key); if (l) l.push(g); else map.set(key, [g]); };
  for (const it of items) {
    const sc = scrapLook(it.sc);
    const alpha = Math.round(Math.max(0, Math.min(1, it.alpha ?? 1)) * 4) / 4;
    if (alpha <= 0) continue;
    const s = sc.s * (0.8 + 0.4 * sc.dy) * (it.scale ?? 1) * u;
    const colour = sc.foil ? tone(sc.colour, 1.3) : sc.back ? tone(sc.colour, 0.62) : sc.colour;
    const [lift, turn] = hop ? hop(sc) : [0, 0];
    const a = sc.a + turn;
    if (sc.shape === 'curl') {
      // a curl stands up off the floor: an open loop, its shadow a smudge under it
      put(curls, `${colour}|${alpha}`, { x: it.x, y: it.y - 0.4 * s - lift, rx: 1.2 * s, ry: 0.7 * s, a0: a * 2, a1: a * 2 + 2.8 });
      if (!lite && alpha === 1) shadows.push({ dot: true, x: it.x, y: it.y + 0.2 * s, rx: 1.2 * s, ry: 0.4 * s, off: 0 });
      continue;
    }
    let g;
    if (sc.shape === 'dot') g = { dot: true, x: it.x, y: it.y, rx: 1.15 * s, ry: 1.15 * s * FLAT, lift };
    else {
      const hw = (sc.shape === 'square' ? 1.15 : 1.8) * s, hh = (sc.shape === 'square' ? 1.15 : 0.9) * s;
      const c = Math.cos(a), n = Math.sin(a), p = [];
      for (const [px, py] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) p.push(it.x + px * c - py * n, it.y + (px * n + py * c) * FLAT);
      g = { p, lift };
    }
    put(fills, `${colour}|${alpha}`, g);
    if (!lite && alpha === 1) shadows.push({ ...g, off: 0.45 * s });
    if (sc.foil && glint > 0.05) shine.push(g);
  }
  ctx.save();
  if (shadows.length) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); for (const g of shadows) traceScrap(ctx, g, g.off); ctx.fill();
  }
  for (const [key, list] of fills) {
    const [colour, alpha] = key.split('|');
    ctx.globalAlpha = Number(alpha); ctx.fillStyle = colour;
    ctx.beginPath(); for (const g of list) traceScrap(ctx, g, -g.lift); ctx.fill();
  }
  ctx.lineWidth = 0.75 * u; ctx.lineCap = 'butt';
  for (const [key, list] of curls) {
    const [colour, alpha] = key.split('|');
    ctx.globalAlpha = Number(alpha); ctx.strokeStyle = colour;
    ctx.beginPath();
    for (const g of list) {
      ctx.moveTo(g.x + g.rx * Math.cos(g.a0), g.y + g.ry * Math.sin(g.a0));
      ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, g.a0, g.a1);
    }
    ctx.stroke();
  }
  if (shine.length) {
    ctx.globalAlpha = 0.85 * glint; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); for (const g of shine) traceScrap(ctx, g, -g.lift); ctx.fill();
  }
  ctx.restore();
}
export const partyAge = (m, beat) => beat - m.beat0;
export const partyAlive = (m, beat) => partyAge(m, beat) >= 0 && partyAge(m, beat) < m.beats;

/**
 * DOLORES WALKS OFF THE JOB (Peter, 5 Oct 2026: "clicking on dolores she should stop and join in
 * the dancing for a while", then "could she fling away her broom and dance and then just run
 * off"): tapped while she sweeps, she flings the broom — spinning away over the floor and out of
 * the picture — dances DOLORES_DANCE_BEATS where she stands, then legs it off the nearer side,
 * leaving what she hadn't swept (club.js tapDolores). `m.quit` is { from (beats of the moment's
 * age), dance (beats), out (the side she runs off, ±1), sweptTo (how far the broom had got) }.
 */
export const DOLORES_DANCE_BEATS = 16;
export const DOLORES_FLING_BEATS = 1;      // the throw, before the dance
export const DOLORES_RUN_BEATS = 2;        // off the floor, at a sprint
// The broom goes slowly enough to watch it go (Peter, 6 Oct 2026: "so quick it's hard to see it
// spinning away"): a high lob out of the picture over three beats, end over end half a turn a beat.
const BROOM_FLIGHT_BEATS = 3;
const BROOM_TURNS_PER_BEAT = 0.5;
/** Her dance: Grumpos's groove, the club's other stout dancer, on the beat. */
const DOLORES_DANCE = Object.freeze({ ...(HERO_DANCE_LAB_CANDIDATES.find((c) => c.hero === 'grumpos' && c.move === 'groove') || { move: 'groove' }), hero: 'dolores' });
const DOLORES_SHUFFLE = Object.freeze({ ...DOLORES_DANCE, move: 'shuffle', footwork: null });
const SHUFFLE_STANCE = 0.12;   // feet together, from the middle: the groove's own stance
const SHUFFLE_STEP = 0.16;     // one step-together, of her height
const SHUFFLE_LIFT = 0.045;    // how high the stepping foot comes up
// her hands well out from her sides in both moves, not tucked against the apron (Peter, 6 Oct 2026)
const ARMS_OUT = 0.2;
const armsOut = (pose) => ({ ...pose, dance: { ...pose.dance, hands: pose.dance.hands.map(([o, l]) => [o + ARMS_OUT, l]) } });
const smooth = (v) => { const n = clamp(v); return n * n * (3 - 2 * n); };

/**
 * Dolores's dance at song beat `beat`, once she has walked off the job (Peter, 6 Oct 2026: "a
 * couple of dance moves not just one.. perhaps a shuffle side to side"): Grumpos's groove where
 * she stands, and every other bar a SIDE SHUFFLE — a step-together on each beat, two towards the
 * middle of the floor and two back, so the bar ends where it began. The groove takes the part-bars
 * at either end of the dance, so she only ever shuffles a whole bar, from her spot and back to it.
 */
export function doloresDancePose(m, beat) {
  const q = m.quit, groove = armsOut(heroDancePose(DOLORES_DANCE, beat));
  if (!q) return groove;
  const start = m.beat0 + q.from + DOLORES_FLING_BEATS, end = start + q.dance;
  const first = Math.ceil(start / 4) * 4, bar = Math.floor(beat / 4) * 4;
  if (!(bar >= first && bar + 4 <= end && ((bar - first) / 4) % 2 === 0)) return groove;
  const f = beat - bar, i = Math.min(3, Math.floor(f)), g = f - i;
  const way = i < 2 ? 1 : -1;                    // towards the middle, then back
  const from = [0, 1, 2, 1][i] * SHUFFLE_STEP;   // where her feet were together on the beat
  // the leading foot steps out on the beat, the other closes up to it on the "and"
  const out = smooth(g * 2), close = smooth(g * 2 - 1);
  const lead = from + way * (SHUFFLE_STANCE + SHUFFLE_STEP * out), trail = from - way * SHUFFLE_STANCE + way * SHUFFLE_STEP * close;
  const body = (lead + trail) / 2;
  const leadUp = g < 0.5 ? Math.sin(g * 2 * Math.PI) : 0, trailUp = g >= 0.5 ? Math.sin((g * 2 - 1) * Math.PI) : 0;
  // which way the middle is, in her own frame (she is drawn facing the way she swept)
  const toward = -q.out * m.dir;
  // the foot on the middle's side, and the other, as [x from her middle, lift]
  const near = way > 0 ? [lead - body, leadUp] : [trail - body, trailUp];
  const far = way > 0 ? [trail - body, trailUp] : [lead - body, leadUp];
  const [front, back] = toward > 0 ? [near, far] : [far, near];
  const shuffle = armsOut(heroDancePose(DOLORES_SHUFFLE, beat));
  // the arms come out of the groove and go back into it over a quarter of a beat
  const w = smooth(Math.min(f, 4 - f) / 0.25);
  const hands = groove.dance.hands.map((hd, k) => hd.map((v, j) => v + (shuffle.dance.hands[k][j] - v) * w));
  return groundDanceFeet({ ...shuffle,
    dance: { ...shuffle.dance, hands,
      feet: [[front[0] * toward, -SHUFFLE_LIFT * front[1]], [back[0] * toward, -SHUFFLE_LIFT * back[1]]],
      ankles: [0.3 * front[1], 0.3 * back[1]] },
    shift: toward * body,
    tilt: 0.03 * toward * Math.sin(f * Math.PI / 2),   // leaning into the way she is going
    bounce: 0.012 * Math.abs(Math.sin(g * 2 * Math.PI)) });
}

/**
 * How far across the cleaner has got (0–1 of the crossing) — and, once Dolores has walked off
 * the job, how far into the throw (`flinging`, beats), the dance, or the run off (`running`, 0–1).
 */
export function cleanerWalk(m, beat) {
  const age = partyAge(m, beat);
  const walk = PARTY_BEATS[m.kind] || m.beats;
  const still = { progress: age / walk, flinging: null, dancing: false, danceAge: 0, danceLeft: 0, running: null };
  const q = m.quit;
  if (!q || age < q.from) return still;
  const at = age - q.from, d = at - DOLORES_FLING_BEATS;
  const base = { ...still, progress: q.from / walk };
  if (at < DOLORES_FLING_BEATS) return { ...base, flinging: at };
  if (d < q.dance) return { ...base, dancing: true, danceAge: d, danceLeft: q.dance - d };
  return { ...base, running: Math.min(1, (d - q.dance) / DOLORES_RUN_BEATS) };
}

/** Dolores's broom along +x through the origin: the shaft, and the head at the +x end. */
function drawBroom(ctx, h) {
  ctx.lineCap = 'round'; ctx.strokeStyle = '#a88f69'; ctx.lineWidth = h * 0.016;
  ctx.beginPath(); ctx.moveTo(-h * 0.25, 0); ctx.lineTo(h * 0.25, 0); ctx.stroke();
  ctx.strokeStyle = '#abd0c6'; ctx.lineWidth = h * 0.032;
  for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(h * 0.25, 0); ctx.lineTo(h * (0.35 + 0.012 * Math.abs(j - 2)), h * (j - 2) * 0.02); ctx.stroke(); }
}

/**
 * The broom, flung `flung` beats ago towards side `out` from her hands at `x`: up to about her own
 * height over her head a little before halfway, then dropping as it goes out of the picture, end
 * over end.
 */
function drawFlungBroom(ctx, flung, out, x, floor, h, width) {
  const x0 = x + out * h * 0.12, y0 = floor - h * 0.62;
  const gone = out > 0 ? width + h * 0.6 - x0 : x0 + h * 0.6;   // how far it flies to be out of the picture
  if (!(flung >= 0 && flung <= BROOM_FLIGHT_BEATS)) return;
  const k = flung / BROOM_FLIGHT_BEATS;
  ctx.save();
  ctx.translate(x0 + out * gone * k, y0 - h * (4.4 * k - 4.9 * k * k));
  ctx.rotate(out * (flung * BROOM_TURNS_PER_BEAT * 2 - 0.3) * Math.PI);
  drawBroom(ctx, h);
  ctx.restore();
}
const clamp = v => Math.max(0, Math.min(1, v));
export function dropMotion(age, jumpAt = 4) {
  if (age < 0 || age >= jumpAt + 1) return { crouch: 0, jump: 0 };
  if (age < jumpAt) return { crouch: clamp(age / Math.max(0.01, jumpAt)), jump: 0 };
  return { crouch: 0, jump: Math.sin((age - jumpAt) * Math.PI) };
}
/**
 * The crowd while Fernwick draws (his LONGBOW, club.js — a `draw` moment, counted on its own
 * clock because the drop is a seek and the song's beat count jumps on it): sinking into the
 * crouch for as long as he holds (a bar to get all the way down), and once he lets go —
 * `releaseAge` beats in — the rest of the way by the drop, `jumpAt` beats in, where they
 * jump. Both null while the bow is still drawn.
 */
export function drawMotion(age, jumpAt = null, releaseAge = null) {
  if (!(age >= 0)) return { crouch: 0, jump: 0 };
  const held = clamp(age / DRAW_CROUCH_BEATS);
  if (jumpAt == null) return { crouch: held, jump: 0 };
  if (age < jumpAt) {
    const from = clamp((releaseAge ?? age) / DRAW_CROUCH_BEATS);
    const left = jumpAt - (releaseAge ?? age);
    return { crouch: left > 0 ? from + (1 - from) * clamp((age - (releaseAge ?? age)) / left) : 1, jump: 0 };
  }
  if (age < jumpAt + 1) return { crouch: 0, jump: Math.sin((age - jumpAt) * Math.PI) };
  return { crouch: 0, jump: 0 };
}
export function partyHero(m, beat, hero, i, pose) {
  const age = partyAge(m, beat);
  if (!partyAlive(m, beat)) return { pose, lift: 0 };
  if (m.kind === 'drop-jump' || m.kind === 'draw') {
    const { crouch, jump } = m.kind === 'draw' ? drawMotion(age, m.jumpAt, m.releaseAge) : dropMotion(age, m.jumpAt);
    if (jump > 0) return { pose: { ...pose, kind: 'jump', grounded: false, vy: 200 * Math.cos((age - m.jumpAt) * Math.PI),
      dance: { hands: [[0.65, -0.7], [0.65, -0.7]], feet: null }, shift: 0, tilt: 0, bounce: 0 }, lift: jump * 0.4 };
    // A compact crouch with feet fixed: lower the body, bend knees, tuck arms.
    const dip = crouch * 0.1;
    return { pose: { ...pose, kind: 'stand', grounded: true, time: 0,
      dance: { hands: [[0.65, 0.65], [0.65, 0.65]], feet: [[0.12, dip], [-0.12, dip]], ankles: [0, 0], legFlex: 0.5 },
      shift: 0, tilt: 0, bounce: -dip }, lift: 0 };
  }
  if (m.kind === 'spotlight' && m.hero === i) {
    // In the spotlight a hero does their CELEBRATION, not a dance (Peter, 3 Oct 2026): the
    // painter's own victory routine for them, run on the beat.
    return { pose: { kind: 'celebrate', grounded: true, menu: true, time: age * 0.5, phase: (age / 2) % 1,
      shift: 0, bounce: 0, tilt: 0 }, lift: 0 };
  }
  if (m.kind === 'bubbles' && hero === 'b33p') return { pose: { ...pose, headTurn: 22 * Math.sin(age * 0.7) }, lift: 0 };
  if (m.kind === 'bubbles' && hero === 'rusty' && age > 4 && age < 6) return {
    pose: { ...pose, headTurn: -15, dance: { ...pose.dance, hands: [[0.7, -0.65], [0.7, 0.65]] } }, lift: 0 };
  return { pose, lift: 0 };
}

/**
 * A party moment's front layer. Returns where Dolores stands, for a tap on her —
 * { x, floor, h, dancing } — while she is on the floor; nothing otherwise.
 */
export function drawPartyFront(ctx, m, beat, { width, floorRef, toonH, stageTop, stageBot, u, scraps = null, glint = 0, lite = false, hop = null }) {
  const age = partyAge(m, beat), progress = age / m.beats;
  if (!partyAlive(m, beat)) return null;
  let spot = null;
  ctx.save();
  if (m.kind === 'bubbles') {
    const fade = Math.min(clamp(age), clamp((m.beats - age) / 2));
    for (let i = 0; i < 24; i++) {
      const life = (age - i * 0.25) / 10;
      if (life < 0 || life > 1) continue;
      const x = width * ((i * 0.381966 + life * 0.12) % 1) + Math.sin(age * 0.6 + i) * 5 * u;
      const y = floorRef + toonH * 0.15 - life * (floorRef - stageTop + toonH * 0.5);
      const r = (2 + i % 4) * u;
      ctx.globalAlpha = fade * Math.min(1, life * 8, (1 - life) * 6) * 0.65;
      ctx.strokeStyle = ['#a8f4ff', '#ffc2ef', '#e8dfaa'][i % 3];ctx.lineWidth = 0.6 * u;
      ctx.beginPath();ctx.arc(x, y, r, 0, Math.PI * 2);ctx.stroke();
      ctx.strokeStyle = '#ffffff';ctx.lineWidth = 0.8 * u;
      ctx.beginPath();ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.7, 3.5, 4.7);ctx.stroke();
    }
  }
  if (m.kind === 'vacuum') {
    // THE VACUUM CLEANER (the food court's dust devil, Peter 3 Oct 2026) comes for the confetti
    // instead of Dolores, now and then: it crosses the floor scrubbing back and forth, drawing
    // the scraps ahead of it in and leaving the floor clean behind it.
    const h = toonH * 0.78, w = h * 0.9, dir = m.dir;
    const walk = vacuumWalk(m, beat);
    const turbo = walk.turbo;
    const lead = dir > 0 ? -w + walk.progress * (width + w * 2) : width + w - walk.progress * (width + w * 2);
    // scrubbing back and forth — or, in turbo, straight on and shaking
    const x = turbo != null ? lead + Math.sin(age * 70) * w * 0.04 : lead + Math.sin(walk.progress * Math.PI * 9) * w * 0.5;
    const floor = cleanerFloor(floorRef, toonH, stageBot, u);
    const nozzle = lead + dir * w * 0.2;
    const pull = turbo != null ? h * 4 : h * 1.4;
    const left = [];
    for (const sc of scraps || []) {
      const ahead = (sc.x - nozzle) * dir;
      if (ahead < 0) continue;                      // behind the cleaner: gone
      const k = ahead < pull ? 1 - ahead / pull : 0;
      const sx = sc.x - dir * ahead * (turbo != null ? Math.min(1, k * 1.6) : k * 0.9);   // drawn in toward the nozzle
      left.push({ sc, x: sx, y: scrapY(floorRef, toonH, stageBot, u, sc.dy) - k * toonH * (turbo != null ? 0.3 : 0.1), scale: 1 - k * 0.5 });
    }
    drawScraps(ctx, left, u, { glint, lite, hop });
    if (turbo != null) {
      // its wind: streaks pouring into the nozzle from ahead of it
      ctx.save();
      ctx.strokeStyle = 'rgba(220,235,255,0.5)'; ctx.lineWidth = 0.8 * u;
      for (let j = 0; j < 7; j++) {
        const q = ((age * 3 + j / 7) % 1);
        const sx0 = nozzle + dir * pull * (1 - q), sy0 = floor - h * (0.1 + 0.6 * ((j * 0.37) % 1)) * (1 - q);
        ctx.globalAlpha = 0.6 * q;
        ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 - dir * h * 0.35, sy0 + h * 0.05); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x + w / 2, floor - h / 2 + 1.5);
    ctx.scale(dir > 0 ? -1 : 1, 1);
    if (turbo != null) ctx.rotate(-0.12);   // leaning into it
    ctx.translate(-w / 2, -h / 2);
    drawProp(ctx, 'dustdevil', 0, 0, w, h);
    ctx.restore();
    spot = { kind: 'vacuum', x: x + w / 2, floor, w, h, nozzle, turbo };
  }
  if (m.kind === 'cleaner') {
    const h = toonH * 0.95, dir = m.dir;   // a little smaller, down the floor
    const walk = cleanerWalk(m, beat);
    const q = m.quit;
    const at = dir > 0 ? -h + walk.progress * (width + h * 2) : width + h - walk.progress * (width + h * 2);
    // walked off the job: away off her side of the floor, getting up to speed
    const x = walk.running == null ? at : at + ((q.out > 0 ? width + h : -h) - at) * walk.running ** 1.6;
    const floor = cleanerFloor(floorRef, toonH, stageBot, u);
    spot = { x, floor, h, dancing: walk.dancing || walk.flinging != null, running: walk.running != null };
    // The confetti left on the floor by the last drops (the club's `floorConfetti`, handed
    // in as `scraps`) disappears behind the broom as she crosses — and stays put once she has
    // thrown the broom away.
    const edge = q ? q.sweptTo ?? at + dir * h * 0.4 : x + dir * h * 0.4;
    drawScraps(ctx, (scraps || []).filter((sc) => (dir > 0 ? sc.x >= edge : sc.x <= edge))
      .map((sc) => ({ sc, x: sc.x, y: scrapY(floorRef, toonH, stageBot, u, sc.dy) })), u, { glint, lite, hop });
    if (q) drawFlungBroom(ctx, age - q.from, q.out, at, floor, h, width);
    if (q && age >= q.from) {
      ctx.translate(x, floor); ctx.scale(walk.running != null ? q.out : dir, 1);
      // delighted from the moment she lets go of the broom, and serious again for the run off (Peter, 6 Oct 2026)
      if (walk.running != null) {
        // at a sprint, arms going, and gone
        drawToon(ctx, 'dolores', { kind: 'run', grounded: true, time: age * 0.9, phase: (age * 1.1) % 1 }, 0, 0, h);
      } else if (walk.flinging != null) {
        // the throw: both arms up and after it
        drawToon(ctx, 'dolores', { kind: 'stand', grounded: true, time: 0, faceJoy: true, dance: { hands: [[0.7, -0.75], [0.7, -0.75]] } }, 0, 0, h);
      } else {
        // dancing on the beat where she stood
        const pose = doloresDancePose(m, beat);
        // into the sway from the throw, and out of it again, over half a beat each way
        const ease = Math.min(1, walk.danceAge * 2, walk.danceLeft * 2);
        ctx.translate((pose.shift || 0) * h * ease, -(pose.bounce || 0) * h * ease);
        ctx.rotate((pose.tilt || 0) * ease);
        drawToon(ctx, 'dolores', pose, 0, 0, h);
      }
      ctx.restore();
      return spot;
    }
    ctx.translate(x, floor);ctx.scale(dir, 1);
    // Dolores faces us as she sweeps, so the broom runs across her front: the top hand high
    // by her chest, the other low on the far side, the shaft drawn THROUGH both — worked out
    // from where the painter puts a hand for a given [out, lift] (measured, 3 Oct 2026) — and
    // broken under each so the gloves close round it (Peter: "hands don't touch her broom").
    const H0 = [0.0, -0.4], H1 = [0.3, 1.0];
    drawToon(ctx, 'dolores', { kind: 'run', grounded: true, time: age * 0.35, phase: age * 0.45 % 1,
      dance: { hands: [H0, H1] } }, 0, 0, h);
    const p0 = [-(0.08 + 0.23 * H0[0]), -(0.47 - 0.24 * H0[1])];
    const p1 = [0.13 + 0.23 * H1[0], -(0.49 - 0.24 * H1[1])];
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ux = (p1[0] - p0[0]) / L, uy = (p1[1] - p0[1]) / L;
    const top = [p0[0] - ux * 0.16, p0[1] - uy * 0.16];
    const foot = [p0[0] + ux * (-p0[1] / uy), 0];
    const total = Math.hypot(foot[0] - top[0], foot[1] - top[1]), s0 = 0.16, s1 = s0 + L;
    const along = (d) => [(top[0] + ux * d) * h, (top[1] + uy * d) * h];
    ctx.lineCap = 'round'; ctx.strokeStyle = '#a88f69'; ctx.lineWidth = h * 0.016;
    for (const [a0, b0] of [[0, s0 - 0.03], [s0 + 0.03, s1 - 0.03], [s1 + 0.03, total]]) {
      const [ax, ay] = along(a0), [bx, by] = along(b0);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.strokeStyle = '#abd0c6'; ctx.lineWidth = h * 0.032;
    for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(h * (foot[0] - 0.045 + j * 0.022), -h * 0.03); ctx.lineTo(h * (foot[0] - 0.06 + j * 0.03), h * 0.005); ctx.stroke(); }
  }
  ctx.restore();
  return spot;
}
