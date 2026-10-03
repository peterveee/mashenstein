// IT'S ALIVE! BAKE-OFF — what is brought to life on the slab. 3 Oct 2026.
//
// Peter: "What are we actually making alive? We have the music note… let's do a bakeoff
// with a few different things brought to life." Candidates only — nothing here is shipped
// until one is picked; birth.js takes a `subject` painter, and the music note is its own.
//
// Every painter is (ctx, x, y, r, s): centred on (x, y), about r in radius, with
// s = { charge 0–1 as the coils build, alive, since (seconds since the flash), t }. Dormant
// it is grey and still, lit cold by the arcs; alive it takes its colours, opens its eyes
// and moves to a beat.

const ALIVE = '#7cff6b';
const lerp = (a, b, k) => a + (b - a) * k;
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
/** Grey when dormant, its own colour once alive. */
const tint = (alive, colour, dormant = '#5a6070') => (alive ? colour : dormant);
/** A pair of eyes: shut lines while dormant, open with pupils once alive, blinking now and then. */
function eyes(ctx, x, y, gap, er, s) {
  const blink = s.alive && (s.t % 2.6) > 2.45;
  for (const dx of [-gap / 2, gap / 2]) {
    if (!s.alive || blink) {
      ctx.strokeStyle = '#1b1828'; ctx.lineWidth = er * 0.35; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + dx - er * 0.8, y); ctx.lineTo(x + dx + er * 0.8, y); ctx.stroke();
      ctx.lineCap = 'butt';
      continue;
    }
    const open = Math.min(1, s.since * 6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(x + dx, y, er, er * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1828';
    ctx.beginPath(); ctx.arc(x + dx + er * 0.2 * Math.sin(s.t * 1.7), y + er * 0.1, er * 0.48 * open, 0, Math.PI * 2); ctx.fill();
  }
}
/** A mouth: flat while dormant, a grin once alive. */
function grin(ctx, x, y, w, s) {
  ctx.strokeStyle = '#1b1828'; ctx.lineWidth = w * 0.14; ctx.lineCap = 'round';
  ctx.beginPath();
  if (s.alive) ctx.arc(x, y - w * 0.35, w * 0.6, Math.PI * 0.2, Math.PI * 0.8);
  else { ctx.moveTo(x - w * 0.4, y); ctx.lineTo(x + w * 0.4, y); }
  ctx.stroke(); ctx.lineCap = 'butt';
}
const beatPump = (s, k = 1) => (s.alive ? 1 + 0.06 * k * Math.max(0, Math.sin(s.t * Math.PI * 4)) : 1);

export const BIRTH_SUBJECTS = Object.freeze({
  /** THE BOOMBOX: speakers for eyes, the tape door its mouth, pumping to the beat. */
  boombox(ctx, x, y, r, s) {
    const k = beatPump(s);
    const w = r * 2.6, h = r * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, 2 - k);
    ctx.strokeStyle = tint(s.alive, '#c8c8d8'); ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(-w * 0.3, -h / 2); ctx.lineTo(-w * 0.25, -h * 0.85); ctx.lineTo(w * 0.25, -h * 0.85); ctx.lineTo(w * 0.3, -h / 2); ctx.stroke();
    ctx.fillStyle = tint(s.alive, '#e04848'); rr(ctx, -w / 2, -h / 2, w, h, r * 0.18); ctx.fill();
    for (const dx of [-w * 0.3, w * 0.3]) {
      ctx.fillStyle = '#1b1828'; ctx.beginPath(); ctx.arc(dx, 0, r * 0.48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tint(s.alive, '#3a3448', '#2a2e38'); ctx.beginPath(); ctx.arc(dx, 0, r * 0.36 * k, 0, Math.PI * 2); ctx.fill();
      if (s.alive) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(dx + r * 0.08 * Math.sin(s.t * 1.7), -r * 0.02, r * 0.14, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = '#1b1828'; rr(ctx, -r * 0.32, -h * 0.05, r * 0.64, h * 0.38, r * 0.06); ctx.fill();
    if (s.alive) { ctx.fillStyle = '#ffffff'; for (const dx of [-0.2, 0, 0.2]) ctx.fillRect(dx * r - r * 0.06, -h * 0.05, r * 0.12, h * 0.12); }
    ctx.restore();
  },

  /** THE CASSETTE: its reels are the eyes and they start to turn; the tape window smiles. */
  cassette(ctx, x, y, r, s) {
    const w = r * 2.5, h = r * 1.6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(s.alive ? Math.sin(s.t * Math.PI * 2) * 0.06 : 0);
    ctx.fillStyle = tint(s.alive, '#2a2540', '#3a3e48'); rr(ctx, -w / 2, -h / 2, w, h, r * 0.12); ctx.fill();
    ctx.fillStyle = tint(s.alive, '#ffd23f', '#6a6e78'); rr(ctx, -w * 0.42, -h * 0.4, w * 0.84, h * 0.5, r * 0.06); ctx.fill();
    ctx.fillStyle = '#1b1828'; rr(ctx, -w * 0.3, -h * 0.28, w * 0.6, h * 0.28, r * 0.12); ctx.fill();
    for (const dx of [-w * 0.18, w * 0.18]) {
      ctx.save(); ctx.translate(dx, -h * 0.14); ctx.rotate(s.alive ? s.t * 5 : 0);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b1828';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(Math.cos(a) * r * 0.1 - r * 0.02, Math.sin(a) * r * 0.1 - r * 0.02, r * 0.04, r * 0.04); }
      if (s.alive) { ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    grin(ctx, 0, h * 0.3, r * 0.7, s);
    ctx.restore();
  },

  /** THE FRANKENSPEAKER: a speaker cabinet with neck bolts and stitches; the woofer is its mouth. */
  frankenspeaker(ctx, x, y, r, s) {
    const k = beatPump(s, 1.6);
    const w = r * 1.6, h = r * 2.4;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#8a8e98';
    ctx.fillRect(-w / 2 - r * 0.22, h * 0.05, r * 0.24, r * 0.16); ctx.fillRect(w / 2 - r * 0.02, h * 0.05, r * 0.24, r * 0.16);
    ctx.fillStyle = tint(s.alive, '#6aa860', '#4a5058'); rr(ctx, -w / 2, -h / 2, w, h, r * 0.1); ctx.fill();
    ctx.strokeStyle = '#1b1828'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(-w * 0.35, -h * 0.42); ctx.lineTo(w * 0.35, -h * 0.42); ctx.stroke();
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.1, -h * 0.46); ctx.lineTo(i * w * 0.1, -h * 0.38); ctx.stroke(); }
    eyes(ctx, 0, -h * 0.2, w * 0.45, r * 0.17, s);
    ctx.fillStyle = '#1b1828'; ctx.beginPath(); ctx.arc(0, h * 0.18, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tint(s.alive, '#3a3448', '#2a2e38'); ctx.beginPath(); ctx.arc(0, h * 0.18, r * 0.42 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1828'; ctx.beginPath(); ctx.arc(0, h * 0.18, r * 0.14 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /** THE RECORD: a vinyl disc that spins up, a face on its label. */
  record(ctx, x, y, r, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.save(); ctx.rotate(s.alive ? s.t * 4 : 0);
    ctx.fillStyle = '#16131f'; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = r * 0.02;
    for (let g = 0.6; g < 1.15; g += 0.1) { ctx.beginPath(); ctx.arc(0, 0, r * g, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, -0.6, -0.1); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tint(s.alive, '#ff4fa3', '#6a6e78'); ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, 0, -r * 0.1, r * 0.4, r * 0.11, s);
    grin(ctx, 0, r * 0.2, r * 0.34, s);
    ctx.fillStyle = '#16131f'; ctx.beginPath(); ctx.arc(0, r * 0.36, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /** THE KEYBOARD: a little synth whose keys are its teeth, two knobs for eyes. */
  keyboard(ctx, x, y, r, s) {
    const w = r * 2.8, h = r * 1.2;
    ctx.save(); ctx.translate(x, y + (s.alive ? -Math.abs(Math.sin(s.t * Math.PI * 2)) * r * 0.12 : 0));
    ctx.fillStyle = tint(s.alive, '#3fb8ff', '#4a5058'); rr(ctx, -w / 2, -h / 2, w, h, r * 0.14); ctx.fill();
    eyes(ctx, -w * 0.08, -h * 0.22, w * 0.3, r * 0.13, s);
    const keys = 9, kw = (w * 0.86) / keys, open = s.alive ? Math.max(0, Math.sin(s.t * Math.PI * 4)) * h * 0.12 : 0;
    ctx.fillStyle = '#1b1828'; ctx.fillRect(-w * 0.43, h * 0.02, w * 0.86, open + h * 0.02);
    for (let i = 0; i < keys; i++) {
      ctx.fillStyle = '#f2f2f6'; ctx.fillRect(-w * 0.43 + i * kw + kw * 0.06, h * 0.04 + open, kw * 0.88, h * 0.36);
    }
    ctx.fillStyle = '#1b1828';
    for (let i = 0; i < keys - 1; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(-w * 0.43 + (i + 1) * kw - kw * 0.25, h * 0.04 + open, kw * 0.5, h * 0.2);
    ctx.restore();
  },
});
