// IT'S ALIVE! — WHAT COMES ALIVE. 7 Oct 2026.
//
// Two bake-offs: the first (3 Oct, src/dev/birth-subjects.js) found the giant cassette; the
// second asked for more boomboxes and cassettes "with a face, comes alive" — and Peter kept
// five: "i like x,a,b,c (remove the pencil on b though) and d.. mix it up". So every new
// banger's birth stands one of these on the slab at random (pickBirthFace, menus.js), and the
// gallery's `birth-faces-bakeoff` section shows each of them. Taking one out of the game is
// taking it out of BIRTH_FACES.
//
//   X GIANT CASSETTE   the first: reel eyes, a grin, the name on its label
//   A CLEAR CASSETTE   see-through, its tape packs showing; the tape along the bottom smiles
//   B MIXTAPE          cream, the name in marker, marker eyebrows, a mouthful of teeth
//   C CHROME CASSETTE  black and gold metal tape; eyes snap open, then a cocky half-lid and smirk
//   D SILVER BOOMBOX   speakers for eyes, the tape door drops open into a mouth, antenna up
//
// Every face is { letter, name, description, paint(ctx, x, y, r, s) }, birth.js's `subject`:
// it stands on the slab, so it fills the cassette's box — centred on (x, y), about 2.5r wide
// and 1.6r tall, its bottom on y + 0.8r — and only a handle or an antenna rises out of it.
// s = { charge 0–1 as the coils build, alive, since (seconds since the flash), t, name }.
// What every one keeps: dormant it is grey and still with its eyes shut; at the flash it takes
// its colours, its eyes open, it grins, the song's name appears on it, and it moves to the beat.

import { TITLE_FONT } from '../../engine/sprites.js';

const TAU = Math.PI * 2;
const INK = '#1b1828';
const MARKER = "'Permanent Marker', 'Comic Sans MS', 'Chalkboard SE', cursive";
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
const col = (s, live, dead) => (s.alive ? live : dead);
/** How far its eyes have opened: shut until the flash, wide a sixth of a second later. */
const openOf = (s) => (s.alive ? Math.min(1, s.since * 6) : 0);
const blinking = (s) => s.alive && (s.t % 2.6) > 2.45;
/** The beat, twice a second: a kick at each one, falling away through it. */
const kick = (s) => (s.alive ? Math.exp(-((s.t * 2) % 1) * 6) : 0);
/** Alive, it rocks from side to side, once a second. */
const rock = (ctx, s, k = 0.04) => { if (s.alive) ctx.rotate(Math.sin(s.t * TAU) * k); };

/** An eye: a white, a pupil that looks about, a catchlight — a shut line while dormant or blinking. */
function eye(ctx, x, y, R, s, { white = '#f4f4f8', pupil = INK, lid = 0, lidColour = null } = {}) {
  const open = openOf(s);
  if (!(open > 0) || blinking(s)) {
    ctx.strokeStyle = INK; ctx.lineWidth = R * 0.32; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - R * 0.75, y); ctx.lineTo(x + R * 0.75, y); ctx.stroke();
    ctx.lineCap = 'butt';
    return;
  }
  ctx.fillStyle = white; ctx.beginPath(); ctx.ellipse(x, y, R, R * open, 0, 0, TAU); ctx.fill();
  const look = Math.sin(s.t * 1.7) * R * 0.28;
  ctx.fillStyle = pupil; ctx.beginPath(); ctx.ellipse(x + look, y + R * 0.08, R * 0.5, R * 0.5 * open, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + look - R * 0.18, y - R * 0.12, R * 0.15, 0, TAU); ctx.fill();
  if (lid > 0) {   // a lid down over the top of it
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, R * 1.02, R * open * 1.02, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = lidColour || INK; ctx.fillRect(x - R * 1.1, y - R * 1.1, R * 2.2, R * 1.1 + (lid - 0.5) * 2 * R);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = R * 0.18;
    ctx.beginPath(); ctx.moveTo(x - R, y + (lid - 0.5) * 2 * R); ctx.lineTo(x + R, y + (lid - 0.5) * 2 * R); ctx.stroke();
  }
}
/** A reel that is an eye: the toothed hub turning, and the eye inside it opening at the flash. */
function reelEye(ctx, x, y, R, s, { hub = '#f2f2f6', teeth = '#8a8e98', lid = 0, lidColour } = {}) {
  ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(s.alive ? s.t * 5 : 0);
  ctx.fillStyle = teeth;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(Math.cos(a) * R * 0.72 - R * 0.12, Math.sin(a) * R * 0.72 - R * 0.12, R * 0.24, R * 0.24); }
  ctx.restore();
  eye(ctx, x, y, R * 0.5, s, { white: hub, lid, lidColour });
}
/** A mouth: a flat line while dormant; alive, a grin — open with a tongue, or toothy. */
function mouth(ctx, x, y, w, s, { lw = w * 0.12, open = false, teeth = false, smirk = false, colour = INK } = {}) {
  ctx.strokeStyle = s.alive ? colour : INK; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (!s.alive) {
    ctx.beginPath(); ctx.moveTo(x - w * 0.35, y); ctx.lineTo(x + w * 0.35, y); ctx.stroke(); ctx.lineCap = 'butt';
    return;
  }
  const o = openOf(s);
  if (smirk) {
    ctx.beginPath(); ctx.moveTo(x - w * 0.4, y); ctx.quadraticCurveTo(x + w * 0.05, y + w * 0.18 * o, x + w * 0.45, y - w * 0.16 * o); ctx.stroke();
  } else if (open || teeth) {
    const d = w * 0.38 * o;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - d * 0.15); ctx.quadraticCurveTo(x, y + d * 1.9, x + w / 2, y - d * 0.15); ctx.closePath();
    ctx.fillStyle = '#3a1020'; ctx.fill();
    ctx.save(); ctx.clip();
    if (teeth) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w / 2, y - d * 0.2, w, d * 0.55); ctx.strokeStyle = '#c8c8d8'; ctx.lineWidth = lw * 0.35; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.14, y - d * 0.2); ctx.lineTo(x + i * w * 0.14, y + d * 0.35); ctx.stroke(); } }
    else { ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.ellipse(x, y + d * 0.95, w * 0.24, d * 0.45, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - d * 0.15); ctx.quadraticCurveTo(x, y + d * 1.9, x + w / 2, y - d * 0.15); ctx.closePath(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - w * 0.06); ctx.quadraticCurveTo(x, y + w * 0.4 * o, x + w / 2, y - w * 0.06); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
/** The song's name, once it's alive. */
function name(ctx, s, x, y, size, maxW, { colour = INK, font = TITLE_FONT } = {}) {
  if (!s.alive) return;
  ctx.fillStyle = colour; ctx.font = `${Math.max(4, size)}px ${font}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.name, x, y, maxW);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
/** A carrying handle over the top, its ends on the top edge at ±hw. */
function handle(ctx, top, hw, rise, lw, colour) {
  ctx.strokeStyle = colour; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-hw, top); ctx.lineTo(-hw * 0.82, top - rise); ctx.lineTo(hw * 0.82, top - rise); ctx.lineTo(hw, top); ctx.stroke();
  ctx.lineJoin = 'miter';
}
/** An antenna off the top corner: folded flat while dormant, up and swaying once alive. */
function antenna(ctx, x0, y0, len, lw, s, colour) {
  const a = s.alive ? -Math.PI / 2 + 0.45 + Math.sin(s.t * Math.PI * 2) * 0.12 : -0.08;
  const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
  ctx.strokeStyle = colour; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x1, y1, lw * 1.1, 0, TAU); ctx.fill();
}
/** The flash's own glint: a white sheen over it for a moment as it wakes. */
function waking(ctx, s, w, h, r) {
  if (!s.alive || s.since > 0.3) return;
  ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - s.since / 0.3)})`;
  rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
}

/**
 * A cassette's face, the shipped one's arrangement: shell, label with the name, the window
 * with the two reels as eyes, a mouth along the bottom. The candidates dress it differently.
 */
function cassette(ctx, w, h, r, s, o) {
  ctx.fillStyle = col(s, o.shell, '#3a3e48');
  rr(ctx, -w / 2, -h / 2, w, h, r * 0.1); ctx.fill();
  if (o.frame) { ctx.strokeStyle = col(s, o.frame, '#5a5e68'); ctx.lineWidth = r * 0.06; rr(ctx, -w / 2 + r * 0.03, -h / 2 + r * 0.03, w - r * 0.06, h - r * 0.06, r * 0.08); ctx.stroke(); }
  ctx.fillStyle = col(s, o.foot, '#474b56');
  ctx.beginPath(); ctx.moveTo(-w * 0.3, h / 2); ctx.lineTo(-w * 0.24, h * 0.3); ctx.lineTo(w * 0.24, h * 0.3); ctx.lineTo(w * 0.3, h / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = INK;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(sx * w * 0.44, sy * h * 0.4, r * 0.04, 0, TAU); ctx.fill(); }
  ctx.fillStyle = col(s, o.label, '#6a6e78'); rr(ctx, -w * 0.42, -h * 0.42, w * 0.84, h * 0.56, r * 0.06); ctx.fill();
  for (const [i, stripe] of (o.stripes || []).entries()) {
    ctx.fillStyle = col(s, stripe, '#5a5e68'); ctx.fillRect(-w * 0.42, -h * 0.42 + h * (0.06 + i * 0.065), w * 0.84, h * 0.045);
  }
  name(ctx, s, 0, -h * 0.25, r * 0.17, w * 0.78, { colour: o.ink || INK, font: o.font || TITLE_FONT });
  ctx.fillStyle = '#16131f'; rr(ctx, -w * 0.28, -h * 0.14, w * 0.56, h * 0.26, r * 0.13); ctx.fill();
  ctx.fillStyle = col(s, '#5a3a2a', '#3a3a40'); ctx.fillRect(-w * 0.12, -h * 0.07, w * 0.24, h * 0.12);
  for (const dx of [-w * 0.17, w * 0.17]) reelEye(ctx, dx, -h * 0.01, r * 0.2, s, { lid: o.lid || 0, lidColour: o.lidColour });
}

/** The first, and the one without a dice roll (the gallery, the tests). */
export const GIANT_CASSETTE = Object.freeze({
  letter: 'X', name: 'GIANT CASSETTE',
  description: 'The giant cassette, from the first bake-off: its reels turn, the eyes in them open, it grins, and the song’s name is on its label.',
    paint(ctx, x, y, r, { alive, since, t, name: title }) {
      const w = r * 2.5, h = r * 1.6;
      ctx.save();
      ctx.translate(x, y);
      // alive, it rocks to the beat
      if (alive) ctx.rotate(Math.sin(t * TAU) * 0.04);
      const col = (live, dead) => (alive ? live : dead);
      // the shell
      ctx.fillStyle = col('#2a2540', '#3a3e48');
      rr(ctx, -w / 2, -h / 2, w, h, r * 0.1); ctx.fill();
      ctx.fillStyle = col('#3a3456', '#474b56');
      ctx.beginPath(); ctx.moveTo(-w * 0.3, h / 2); ctx.lineTo(-w * 0.24, h * 0.3); ctx.lineTo(w * 0.24, h * 0.3); ctx.lineTo(w * 0.3, h / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1b1828';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(sx * w * 0.44, sy * h * 0.4, r * 0.04, 0, TAU); ctx.fill(); }
      // the label, the song's name on it
      ctx.fillStyle = col('#ffd23f', '#6a6e78'); rr(ctx, -w * 0.42, -h * 0.42, w * 0.84, h * 0.56, r * 0.06); ctx.fill();
      ctx.fillStyle = col('#ff4fa3', '#5a5e68'); ctx.fillRect(-w * 0.42, -h * 0.42 + h * 0.06, w * 0.84, h * 0.05);
      ctx.fillStyle = '#1b1828';
      ctx.font = `${Math.max(4, r * 0.17)}px ${TITLE_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (alive) ctx.fillText(title, 0, -h * 0.25, w * 0.78);
      // the window, and the reels in it — the eyes
      ctx.fillStyle = '#16131f'; rr(ctx, -w * 0.28, -h * 0.14, w * 0.56, h * 0.26, r * 0.13); ctx.fill();
      ctx.fillStyle = col('#5a3a2a', '#3a3a40'); ctx.fillRect(-w * 0.12, -h * 0.07, w * 0.24, h * 0.12);
      const open = alive ? Math.min(1, since * 6) : 0;
      const blink = alive && (t % 2.6) > 2.45;
      for (const dx of [-w * 0.17, w * 0.17]) {
        ctx.save(); ctx.translate(dx, -h * 0.01);
        ctx.fillStyle = '#f2f2f6'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill();
        ctx.save(); ctx.rotate(alive ? t * 5 : 0);
        ctx.fillStyle = '#8a8e98';
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(Math.cos(a) * r * 0.14 - r * 0.025, Math.sin(a) * r * 0.14 - r * 0.025, r * 0.05, r * 0.05); }
        ctx.restore();
        if (open > 0 && !blink) {
          ctx.fillStyle = '#1b1828';
          ctx.beginPath(); ctx.ellipse(r * 0.03 * Math.sin(t * 1.7), 0, r * 0.09, r * 0.09 * open, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-r * 0.03, -r * 0.03, r * 0.025, 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = '#1b1828'; ctx.lineWidth = r * 0.04;
          ctx.beginPath(); ctx.moveTo(-r * 0.1, 0); ctx.lineTo(r * 0.1, 0); ctx.stroke();
        }
        ctx.restore();
      }
      // the mouth, along the bottom: a flat line, then a grin — in the eyes' white, as ink was
      // lost on the dark shell (Peter, 7 Oct 2026)
      ctx.strokeStyle = alive ? '#f2f2f6' : '#1b1828'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
      ctx.beginPath();
      if (alive) ctx.arc(0, h * 0.12, r * 0.42, Math.PI * 0.22, Math.PI * 0.78);
      else { ctx.moveTo(-r * 0.25, h * 0.38); ctx.lineTo(r * 0.25, h * 0.38); }
      ctx.stroke(); ctx.lineCap = 'butt';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
    },
});

export const BIRTH_FACES = Object.freeze([
  GIANT_CASSETTE,
  {
    letter: 'A', name: 'CLEAR CASSETTE',
    description: 'A see-through shell: you can see the tape wound round each reel, a full one and an empty one, and the reels are its eyes. The tape running between the guides along the bottom is its mouth — taut while it sleeps, sagging into a smile once it’s alive. The name is on a slim strip along the top.',
    paint(ctx, x, y, r, s) {
      const w = r * 2.5, h = r * 1.6;
      ctx.save(); ctx.translate(x, y); rock(ctx, s);
      // the shell, smoky and see-through, and its edge
      ctx.fillStyle = col(s, 'rgba(120,190,255,0.28)', 'rgba(110,116,130,0.4)'); rr(ctx, -w / 2, -h / 2, w, h, r * 0.12); ctx.fill();
      ctx.strokeStyle = col(s, '#bfe6ff', '#6a6e78'); ctx.lineWidth = r * 0.06; rr(ctx, -w / 2, -h / 2, w, h, r * 0.12); ctx.stroke();
      ctx.fillStyle = col(s, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.1)'); ctx.fillRect(-w * 0.44, -h * 0.44, w * 0.06, h * 0.7);
      // the tape packs: more on the left, less on the right, turning across as it plays
      const shift = s.alive ? 0.04 * Math.sin(s.t * 0.7) : 0;
      for (const [dx, R] of [[-w * 0.2, r * (0.5 - shift)], [w * 0.2, r * (0.36 + shift)]]) {
        ctx.fillStyle = col(s, '#6a3e26', '#45464e'); ctx.beginPath(); ctx.arc(dx, -h * 0.02, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = col(s, '#8a5232', '#55565e'); ctx.lineWidth = r * 0.02; ctx.beginPath(); ctx.arc(dx, -h * 0.02, R * 0.8, 0, TAU); ctx.stroke();
      }
      for (const dx of [-w * 0.2, w * 0.2]) reelEye(ctx, dx, -h * 0.02, r * 0.21, s, { hub: col(s, '#ffffff', '#c8c8d0') });
      // the strip label along the top
      ctx.fillStyle = col(s, '#ffffff', '#7a7e88'); rr(ctx, -w * 0.38, -h * 0.47, w * 0.76, h * 0.16, r * 0.04); ctx.fill();
      ctx.fillStyle = col(s, '#3ad0ff', '#6a6e78'); ctx.fillRect(-w * 0.38, -h * 0.47 + h * 0.12, w * 0.76, h * 0.03);
      name(ctx, s, 0, -h * 0.4, r * 0.15, w * 0.7);
      // the guides, and the tape between them: the mouth
      const gy = h * 0.4, gx = w * 0.3;
      ctx.fillStyle = col(s, '#e0e4ec', '#7a7e88');
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * gx, gy, r * 0.07, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = col(s, '#5a321e', '#3a3a40'); ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-gx, gy); ctx.quadraticCurveTo(0, gy + r * 0.32 * openOf(s) * (1 + 0.15 * kick(s)), gx, gy); ctx.stroke();
      ctx.lineCap = 'butt';
      waking(ctx, s, w, h, r * 0.12);
      ctx.restore();
    },
  },
  {
    letter: 'B', name: 'MIXTAPE',
    description: 'A cream home-made mixtape: the name scrawled in marker on its label, marker eyebrows above the reel eyes. Alive, the brows shoot up and it grins with a mouthful of teeth.',
    paint(ctx, x, y, r, s) {
      const w = r * 2.5, h = r * 1.6;
      ctx.save(); ctx.translate(x, y); rock(ctx, s, 0.05);
      cassette(ctx, w, h, r, s, { shell: '#efe6d2', foot: '#d8ccb2', label: '#ffffff', stripes: [], ink: '#2a3a9a', font: MARKER });
      // marker eyebrows over the reels, on the label
      const up = s.alive ? openOf(s) * h * 0.05 + kick(s) * h * 0.02 : 0;
      ctx.strokeStyle = col(s, '#2a3a9a', '#4a4e58'); ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * w * 0.24, -h * 0.13 - up * 0.5); ctx.quadraticCurveTo(sx * w * 0.17, -h * 0.2 - up, sx * w * 0.1, -h * 0.15 - up * 0.6); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.fillStyle = col(s, '#ff5a8a', '#5a5e68'); ctx.font = `${Math.max(4, r * 0.11)}px ${MARKER}`; ctx.textAlign = 'right';
      if (s.alive) ctx.fillText('VOL.1', w * 0.4, -h * 0.34);
      ctx.textAlign = 'left';
      mouth(ctx, 0, h * 0.24, w * 0.3, s, { lw: r * 0.06, teeth: true });
      waking(ctx, s, w, h, r * 0.1);
      ctx.restore();
    },
  },
  {
    letter: 'C', name: 'CHROME CASSETTE',
    description: 'A black metal tape with a chrome frame and a gold label: the cool one. Its reel eyes snap wide open at the flash, then settle into a cocky half-lid, and it smirks out of one side of its mouth.',
    paint(ctx, x, y, r, s) {
      const w = r * 2.5, h = r * 1.6;
      ctx.save(); ctx.translate(x, y); rock(ctx, s, 0.025);
      const lid = s.alive ? Math.min(0.42, Math.max(0, (s.since - 0.5) * 1.2)) : 0;
      cassette(ctx, w, h, r, s, { shell: '#16161e', frame: '#d8dce6', foot: '#2a2a34', label: '#e8c25a', stripes: ['#1a1a22'], lid, lidColour: '#16161e' });
      ctx.fillStyle = col(s, '#b8bcc8', '#4a4e58'); ctx.font = `${Math.max(4, r * 0.08)}px ${TITLE_FONT}`;
      ctx.textAlign = 'center';
      if (s.alive) ctx.fillText('TYPE IV · METAL', 0, h * 0.43);
      ctx.textAlign = 'left';
      // a glint along the chrome, every so often
      if (s.alive && (s.t % 2) < 0.35) {
        const g = ((s.t % 2) / 0.35) * w * 1.4 - w * 0.7;
        ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, r * 0.1); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(g, -h / 2); ctx.lineTo(g + r * 0.2, -h / 2); ctx.lineTo(g - r * 0.3, h / 2); ctx.lineTo(g - r * 0.5, h / 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      mouth(ctx, 0, h * 0.24, w * 0.24, s, { lw: r * 0.06, smirk: true, colour: '#d8dce6' });
      waking(ctx, s, w, h, r * 0.1);
      ctx.restore();
    },
  },
  {
    letter: 'D', name: 'SILVER BOOMBOX',
    description: 'A classic silver boombox. Its two big speakers are its eyes — the cones the whites, the dust caps the pupils, punching out on the beat — the tape door between them drops open into a mouth, the antenna springs up and sways, and the name lights up on the radio strip above the door.',
    paint(ctx, x, y, r, s) {
      const w = r * 2.7, h = r * 1.4, top = r * 0.8 - h;
      ctx.save(); ctx.translate(x, y); rock(ctx, s, 0.03);
      handle(ctx, top + r * 0.02, w * 0.3, r * 0.3, r * 0.1, col(s, '#2b2d34', '#3a3e48'));
      antenna(ctx, w * 0.38, top, r * 1.1, r * 0.04, s, col(s, '#b8bcc8', '#5a5e68'));
      ctx.fillStyle = col(s, '#c7ccd5', '#4a4e58'); rr(ctx, -w / 2, top, w, h, r * 0.16); ctx.fill();
      ctx.fillStyle = col(s, '#9ea5b1', '#3e424c'); ctx.fillRect(-w / 2, top + h * 0.82, w, h * 0.1);
      ctx.fillStyle = col(s, '#e6e9ee', '#5a5e68'); ctx.fillRect(-w / 2 + r * 0.1, top + r * 0.06, w - r * 0.2, r * 0.05);
      // the speakers, and the eyes in them
      const sy = top + h * 0.52, R = r * 0.5;
      for (const sx of [-w * 0.3, w * 0.3]) {
        const k = 1 + 0.06 * kick(s);
        ctx.fillStyle = '#2b2d34'; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = col(s, '#8a8e98', '#4a4e58'); ctx.lineWidth = R * 0.07; ctx.beginPath(); ctx.arc(sx, sy, R * 0.88, 0, TAU); ctx.stroke();
        if (openOf(s) > 0 && !blinking(s)) eye(ctx, sx, sy, R * 0.72 * k, s, { white: '#eef0f4', pupil: '#22242a' });
        else { ctx.fillStyle = '#3e424c'; ctx.beginPath(); ctx.arc(sx, sy, R * 0.72, 0, TAU); ctx.fill(); eye(ctx, sx, sy, R * 0.5, s); }
      }
      // the radio strip, and the name on it
      ctx.fillStyle = col(s, '#1d2a24', '#2a2e38'); rr(ctx, -w * 0.13, top + h * 0.14, w * 0.26, h * 0.16, r * 0.03); ctx.fill();
      name(ctx, s, 0, top + h * 0.22, r * 0.11, w * 0.24, { colour: '#7cff6b' });
      // the tape door: shut while dormant; alive, it drops open into a mouth
      const dx = -w * 0.11, dy = top + h * 0.38, dw = w * 0.22, dh = h * 0.36, o = openOf(s);
      ctx.fillStyle = '#22242a'; rr(ctx, dx, dy, dw, dh, r * 0.04); ctx.fill();
      if (s.alive) {
        ctx.save(); rr(ctx, dx, dy, dw, dh, r * 0.04); ctx.clip();
        ctx.fillStyle = '#3a1020'; ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.ellipse(0, dy + dh * (1.05 - 0.1 * kick(s)), dw * 0.32, dh * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(dx, dy, dw, dh * 0.18);
        ctx.restore();
      }
      const hang = dh * (1 - 0.72 * o);
      ctx.fillStyle = col(s, '#aab0bc', '#454952'); rr(ctx, dx, dy + dh - hang, dw, hang, r * 0.04); ctx.fill();
      ctx.fillStyle = col(s, '#22242a', '#2a2e38'); ctx.fillRect(dx + dw * 0.2, dy + dh - hang + hang * 0.2, dw * 0.6, Math.max(r * 0.03, hang * 0.25));
      // the buttons along the top: one lit on each beat
      for (let i = 0; i < 4; i++) {
        const lit = s.alive && Math.floor(s.t * 2) % 4 === i;
        ctx.fillStyle = lit ? '#ff5a4a' : col(s, '#8a8e98', '#3e424c');
        ctx.fillRect(-w * 0.12 + i * w * 0.065, top - r * 0.06, w * 0.045, r * 0.07);
      }
      waking(ctx, s, w, h, r * 0.16);
      ctx.restore();
    },
  },
]);

/** One of them for a birth. */
export function pickBirthFace(random = Math.random) {
  return BIRTH_FACES[Math.min(BIRTH_FACES.length - 1, Math.floor(random() * BIRTH_FACES.length))];
}
