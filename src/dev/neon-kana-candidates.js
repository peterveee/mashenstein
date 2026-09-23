// NEON — Japanese in the level (BAKE-OFF CANDIDATES, not wired into the game).
//
// Peter, 23 Sep 2026: simple phrases in hiragana, the kind the game already says
// in English, worked into TERMINAL VELOCITY now that its theme is the Yamanote
// line's own departure melody. Four places they could live, and the question
// underneath all four — WHICH FACE — because neither of the game's fonts (Fredoka,
// Lilita One) has a single kana in it, so today any Japanese falls back to
// whatever the device has (Hiragino on Apple, Noto on Android) and looks like a
// different game.
//
// The phrases are deliberately small and common:
//   やった！   yatta!        — did it!           (a coin run, a target)
//   すごい！   sugoi!        — amazing!          (a combo)
//   あぶない！ abunai!       — look out!         (a hazard ahead)
//   いそげ！   isoge!        — hurry!            (the clock)
//   がんばれ！ ganbare!      — you can do it!    (a retry)
//   おかえり   okaeri        — welcome back      (a checkpoint)
//   つぎは しぶや            — next: Shibuya     (the train's destination board)
//   まもなく でんしゃが まいります — a train is arriving (the platform announcement)
import { W, H } from '../engine/renderer.js';

// Candidate faces. M PLUS Rounded is the natural partner for Fredoka (both rounded,
// both friendly); Dela Gothic One is the heavy display face that sits with Lilita
// One; DotGothic16 is a pixel face, for the LED board where dots are the point.
export const KANA_FACES = [
  { id: 'system', name: 'today — system fallback', css: "'Fredoka', 'Trebuchet MS', system-ui, sans-serif", weight: 600 },
  { id: 'rounded', name: 'M PLUS Rounded 1c', css: "'M PLUS Rounded 1c', sans-serif", weight: 800 },
  { id: 'dela', name: 'Dela Gothic One', css: "'Dela Gothic One', sans-serif", weight: 400 },
  { id: 'dot', name: 'DotGothic16', css: "'DotGothic16', sans-serif", weight: 400 },
];
const FACE = Object.fromEntries(KANA_FACES.map((f) => [f.id, f]));

// Loaded from Google Fonts for the bake-off only. Shipping one means adding it to
// wherever the game loads Fredoka — and subsetting it to the kana actually used,
// since a full Japanese face is megabytes.
let requested = false;
export function ensureKanaFonts() {
  if (requested || typeof document === 'undefined') return;
  requested = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800'
    + '&family=Dela+Gothic+One&family=DotGothic16&display=swap';
  document.head.appendChild(link);
  // Asked for WITH the kana: Google serves Japanese faces split by unicode range,
  // and a load that names no text only fetches the Latin slice — the first cut drew
  // Dela Gothic One's kana in the system fallback because of exactly that.
  const sample = 'やったすごいあぶないいそげがんばれおかえりつぎはしぶやまもなくでんしゃがまいりますのて！。';
  for (const f of KANA_FACES.slice(1)) document.fonts?.load(`${f.weight} 24px ${f.css}`, sample).catch(() => {});
}

export function kanaText(ctx, text, x, y, px, face = 'rounded', {
  color = '#ffffff', align = 'center', glow = null, outline = null, baseline = 'alphabetic',
} = {}) {
  const f = FACE[face] || FACE.rounded;
  ctx.save();
  ctx.font = `${f.weight} ${px}px ${f.css}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2, px * 0.18);
    ctx.strokeText(text, x, y);
  }
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = px * 0.6;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ------------------------------------------------------------ A · blade signs
// Vertical neon signs hung off the towers, the way a Tokyo street stacks them.
// SCENERY ONLY: nothing to read mid-jump, so it cannot compete with the hazards —
// it is the city being somewhere.
const SIGNS = [
  { text: 'いそげ', x: 60, top: 70, ink: '#ff4fa3' },
  { text: 'しぶや', x: 210, top: 52, ink: '#38d8f8' },
  { text: 'がんばれ', x: 355, top: 64, ink: '#ffd166' },
  { text: 'やまのて', x: 520, top: 58, ink: '#7dfccf' },
];
export function drawBladeSigns(ctx, t, camX, face = 'rounded', { factor = 0.3 * 2, alpha = 0.9 } = {}) {
  const span = W + 180;
  for (const [i, s] of SIGNS.entries()) {
    const x = ((s.x - camX * factor) % span + span) % span - 60;
    const chars = [...s.text];
    const px = 11;
    const h = chars.length * (px + 2) + 8;
    // A sign that buzzes: one letter of four stays lit through a flicker.
    const flick = Math.sin(t * 3.1 + i * 2) > 0.94 ? 0.35 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,6,24,0.85)';
    ctx.fillRect(x - 9, s.top, 18, h);
    ctx.strokeStyle = s.ink;
    ctx.globalAlpha = alpha * 0.8;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 8.5, s.top + 0.5, 17, h - 1);
    ctx.globalAlpha = alpha * flick;
    chars.forEach((ch, k) => kanaText(ctx, ch, x, s.top + 6 + (k + 1) * (px + 2) - 2, px, face,
      { color: '#ffffff', glow: s.ink }));
    // The bracket it hangs from.
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = s.ink;
    ctx.fillRect(x + 9, s.top + 4, 6, 1);
    ctx.restore();
  }
}

// ------------------------------------------------------------ B · floaties
// The game's own pop-up cards, in Japanese, with the English underneath in small
// type — so a player who reads neither script still gets the joke's shape, and one
// who reads kana gets it first.
export const KANA_FLOATIES = [
  ['やった！', 'YATTA! — DID IT.', '#f6d33c'],
  ['すごい！', 'SUGOI! — THAT WAS A LOT.', '#48e0c8'],
  ['あぶない！', 'ABUNAI! — LOOK OUT.', '#ff6b6b'],
  ['いそげ！', 'ISOGE! — HURRY.', '#a8e6ff'],
  ['おかえり', 'OKAERI — WELCOME BACK.', '#8ddd8d'],
];
export function drawKanaFloatie(ctx, t, x, y, [kana, gloss, color], face = 'rounded') {
  const w = 132;
  const h = 34;
  ctx.save();
  ctx.fillStyle = 'rgba(14,12,30,0.82)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  kanaText(ctx, kana, x, y + 3, 17, face, { color });
  kanaText(ctx, gloss, x, y + 13, 6.5, 'system', { color: 'rgba(236,238,245,0.75)' });
  ctx.restore();
}

// ------------------------------------------------------------ C · LED board
// The train's destination board: an amber dot-matrix strip on the cab, scrolling
// つぎは しぶや and its English. The one place a pixel face is right.
export function drawLedBoard(ctx, t, x, y, w, h, face = 'dot') {
  const text = 'つぎは しぶや　　NEXT · SHIBUYA　　';
  ctx.save();
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,190,90,0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.beginPath();
  ctx.rect(x + 2, y + 1, w - 4, h - 2);
  ctx.clip();
  ctx.font = `${FACE[face].weight} ${h - 3}px ${FACE[face].css}`;
  const tw = ctx.measureText(text).width;
  const off = (t * 26) % tw;
  for (let k = -1; k < 3; k++) {
    kanaText(ctx, text, x + 3 - off + k * tw, y + h - 2.5, h - 3, face,
      { color: '#ffb84a', align: 'left', glow: '#ff9a2a' });
  }
  // The dot mesh over it, so it reads as LEDs even in a smooth face.
  ctx.fillStyle = 'rgba(10,8,6,0.55)';
  for (let yy = y; yy < y + h; yy += 2) ctx.fillRect(x, yy, w, 0.7);
  for (let xx = x; xx < x + w; xx += 2) ctx.fillRect(xx, y, 0.7, h);
  ctx.restore();
}

// ------------------------------------------------------------ D · announcement
// The platform PA as a speech card: a chime glyph where a portrait would be,
// Japanese first, English under it. Once per level — when the train arrives —
// which is when the real one plays.
export function drawAnnouncement(ctx, t, face = 'rounded') {
  const x = W * 0.5;
  const y = 40;
  const w = 330;
  const h = 44;
  ctx.save();
  ctx.fillStyle = 'rgba(14,12,30,0.86)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 8);
  ctx.fill();
  // The chime: two notes, the JR two-tone.
  ctx.fillStyle = '#48e0c8';
  for (const [dx, dy] of [[-w / 2 + 18, -2], [-w / 2 + 27, -7]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy + 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + dx + 2.4, y + dy - 6, 1.2, 12);
  }
  kanaText(ctx, 'まもなく でんしゃが まいります。', x - w / 2 + 42, y + 1, 14, face,
    { color: '#ffffff', align: 'left' });
  kanaText(ctx, 'A TRAIN IS NOW APPROACHING. PLEASE STAND BEHIND THE YELLOW LINE.', x - w / 2 + 42, y + 13, 6.5,
    'system', { color: 'rgba(168,230,255,0.85)', align: 'left' });
  ctx.restore();
}
