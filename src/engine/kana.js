// JAPANESE IN THE NEON CABINET (Peter, 23 Sep 2026 — docs/NEON_LEVELS_PLAN.md §3).
//
// Neither of the game's own faces (Fredoka, Lilita One) has a single kana, so the few
// phrases the neon levels use are drawn in M PLUS Rounded 1c — the rounded face that
// sits beside Fredoka — and the train's destination board in DotGothic16, a pixel face,
// because an LED board is dots.
//
// LOADED AS A SUBSET, and only when a neon stage starts: Google Fonts' `text=` serves a
// font holding exactly the characters asked for, which for the phrases below is a few
// kilobytes instead of the megabytes of a whole Japanese face. Until it arrives the
// system's own Japanese face draws the same words (Peter: "system fallback is also ok"),
// and every cached sign is redrawn once the real face lands.
//
// Every phrase the cabinet can show is listed here, because the subset is built from
// this list: a word added anywhere else would be drawn in the fallback forever.
export const NEON_SIGN_WORDS = ['いそげ', 'しぶや', 'がんばれ', 'やまのて'];
// The smaller signs on the buildings further back: the street's own shop signs.
// えき station · らーめん ramen · おちゃ tea · まつり festival ·
// すみません excuse me / sorry · こんにちは hello · 24じかん "24 hours", the sign
// every convenience store carries (the chains' own names are katakana brands).
// (すし sushi and ゆ bathhouse taken out 24 Sep at Peter's request.)
export const NEON_BACK_SIGN_WORDS = ['えき', 'らーめん', 'すみません', 'おちゃ', 'まつり', 'こんにちは', '24じかん'];
// THE STATIONS, one per train across the neon stages, in the order the Yamanote's
// OUTER (clockwise, 外回り) loop calls them, ending on Shinjuku (Peter, 24 Sep: "the
// last one says next station shinjuku (we are travelling clockwise)").
export const NEON_STATIONS = [
  { kana: 'ごたんだ', en: 'GOTANDA' },
  { kana: 'めぐろ', en: 'MEGURO' },
  { kana: 'えびす', en: 'EBISU' },
  { kana: 'しぶや', en: 'SHIBUYA' },
  { kana: 'はらじゅく', en: 'HARAJUKU' },
  { kana: 'よよぎ', en: 'YOYOGI' },
  { kana: 'しんじゅく', en: 'SHINJUKU' },
];
export const neonBoardText = (st = NEON_STATIONS[3]) => `つぎは ${st.kana}　　NEXT STOP: ${st.en}　　`;
export const NEON_BOARD_TEXT = neonBoardText();
export const NEON_ANNOUNCE_KANA = 'まもなく でんしゃが まいります。';

export const KANA_FACE = "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', system-ui, sans-serif";
export const KANA_WEIGHT = 800;
export const BOARD_FACE = "'DotGothic16', 'Hiragino Sans', 'Noto Sans JP', monospace";

const glyphs = (...texts) => [...new Set([...texts.join('')])].filter((c) => c.trim()).join('');
const ROUNDED_TEXT = glyphs(...NEON_SIGN_WORDS, ...NEON_BACK_SIGN_WORDS, NEON_ANNOUNCE_KANA, '！');
const BOARD_TEXT = glyphs(...NEON_STATIONS.map((st) => neonBoardText(st)));

let requested = false;
let version = 0;
/** Bumped when a face arrives, so a cache keyed on it redraws in the real font. */
export const kanaFontVersion = () => version;

/** Ask for the two subset faces, once. Safe to call every stage start. */
export function ensureKanaFonts() {
  if (requested || typeof document === 'undefined' || !document.head) return;
  requested = true;
  const add = (family, text) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}&display=swap`;
    document.head.appendChild(link);
  };
  add('M+PLUS+Rounded+1c:wght@800', ROUNDED_TEXT);
  add('DotGothic16', BOARD_TEXT);
  const load = (font, text) => document.fonts?.load?.(font, text)
    .then((faces) => { if (faces?.length) version++; })
    .catch(() => {});
  // A stylesheet has to register its @font-face before `load` can find it; ask again
  // shortly, which is cheap and covers a slow first response.
  for (const delay of [0, 800, 3000]) {
    setTimeout(() => {
      load(`${KANA_WEIGHT} 12px 'M PLUS Rounded 1c'`, ROUNDED_TEXT);
      load("12px 'DotGothic16'", BOARD_TEXT);
    }, delay);
  }
}

const SS = 3;   // signs are small and sit still in their layer: bake them sharp
const cache = new Map();
const make = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * SS);
  c.height = Math.ceil(h * SS);
  const g = c.getContext('2d');
  g.scale(SS, SS);
  return { c, g };
};

/**
 * A BLADE SIGN — a vertical neon sign, the way a Tokyo street stacks them off its
 * buildings: a dark plate, a tube outline in `ink`, the word in white with an `ink`
 * glow, one character above the next. Baked once per word, ink and font version, and
 * blitted: a shadowBlur per glyph per frame is not something the background can afford.
 * Returns { canvas, w, h } in background px.
 */
export function neonBladeSign(word, ink) {
  if (typeof document === 'undefined') return null;
  const key = `sign|${word}|${ink}|${version}`;
  let hit = cache.get(key);
  if (hit) return hit;
  const chars = [...word];
  const px = 11;
  const w = 18;
  const h = chars.length * (px + 2) + 8;
  const pad = 6;
  const { c, g } = make(w + pad * 2, h + pad * 2);
  g.translate(pad, pad);
  g.fillStyle = 'rgba(8,6,24,0.9)';
  g.fillRect(0, 0, w, h);
  g.shadowColor = ink;
  g.shadowBlur = 4;
  g.strokeStyle = ink;
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  g.font = `${KANA_WEIGHT} ${px}px ${KANA_FACE}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffffff';
  g.shadowBlur = px * 0.6;
  chars.forEach((ch, k) => {
    const y = 6 + (k + 1) * (px + 2) - 2;
    // Vertical text stands the long-vowel mark up (らーめん): turned a quarter round
    // about its own cell, the way a vertical sign writes it.
    if (ch === 'ー') {
      g.save();
      g.translate(w / 2, y - px * 0.36);
      g.rotate(Math.PI / 2);
      g.textBaseline = 'middle';
      g.fillText(ch, 0, 0);
      g.restore();
      return;
    }
    g.fillText(ch, w / 2, y);
  });
  hit = { canvas: c, w: w + pad * 2, h: h + pad * 2, pad };
  cache.set(key, hit);
  return hit;
}

/**
 * THE DESTINATION BOARD's scrolling strip — つぎは しぶや and its English, amber on
 * black, baked once at `h` px tall; the train painter scrolls a window across it.
 * Returns { canvas, w, h } where `w` is one repeat of the text.
 */
export function neonBoardStrip(h, station = null) {
  if (typeof document === 'undefined') return null;
  const text = station ? neonBoardText(station) : NEON_BOARD_TEXT;
  const key = `board|${h}|${text}|${version}`;
  let hit = cache.get(key);
  if (hit) return hit;
  const probe = make(1, 1).g;
  const px = h - 1;
  probe.font = `${px}px ${BOARD_FACE}`;
  const w = Math.ceil(probe.measureText(text).width) || h * 20;
  const { c, g } = make(w, h);
  g.font = `${px}px ${BOARD_FACE}`;
  g.textBaseline = 'alphabetic';
  g.shadowColor = '#ff9a2a';
  g.shadowBlur = 1.5;
  g.fillStyle = '#ffb84a';
  g.fillText(text, 0, h - 1.2);
  hit = { canvas: c, w, h };
  cache.set(key, hit);
  return hit;
}
