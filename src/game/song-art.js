// THE LOCK SCREEN'S COVER ART for whatever the jukebox or the Lab is playing
// (lifecycle.js songArt): a playable hero's face, one of the club's paper fish, a
// flying toaster, the mirror ball or THE BOLT, picked at random each time a song comes
// on, never the same one twice running — and for a cabinet's own song in the jukebox,
// that cabinet's scenery, from somewhere along one of its stages (Peter, 7–8 Oct 2026).
// Tapped, the lock screen blows the cover up to most of its width, so it is painted
// from the game's own vector painters at full size and supersampled, as the home-screen
// icon is (tools/render-icon.js).
import { drawToonFace, setInk, INK, TOON_SPECS } from '../sprites/toons.js';
import { PROP_PAINTERS } from '../sprites/props.js';
import { HEROES } from '../data/heroes.js';
import { FISHES, FISHBOWL, drawPaperFish } from './banger/club-fish.js';
import { drawDiscoBall, sparkles } from './banger/mirrorball.js';
import { drawBoltButton } from './banger/bolt-button.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { W, H } from '../engine/renderer.js';
import { GROUND_Y } from '../engine/camera.js';
import { ensureKanaFonts } from '../engine/kana.js';
import { clubCrt } from './banger/club-crt.js';

const SUBJECTS = [
  // the eight you can play, not the NPCs and candidates that also have faces
  ...HEROES.filter((h) => TOON_SPECS[h.id]).map((h) => ({ id: h.id, face: h.id })),
  ...[...FISHES, FISHBOWL].map((fish) => ({ id: fish.name, fish })),
  { id: 'GOLDEN TOASTER', toaster: 'appliance' },
  { id: 'SILVER TOASTER', toaster: 'applianceSilver' },
  { id: 'MIRROR BALL', club: 'ball' },
  { id: 'THE BOLT', club: 'bolt' },
];

// The faces sit on the home-screen icon's arcade teal, the fish in deep water, the
// toasters in the night sky they fly across.
const TEAL = {
  bg: [[0, '#2aa9a7'], [0.52, '#12657a'], [1, '#082c49']],
  glow: [[0, 'rgba(116,240,211,0.34)'], [0.58, 'rgba(41,164,168,0.08)'], [1, 'rgba(4,18,37,0)']],
};
const WATER = {
  bg: [[0, '#2b9fcf'], [0.55, '#0e4f80'], [1, '#05193a']],
  glow: [[0, 'rgba(170,235,255,0.32)'], [0.6, 'rgba(60,160,210,0.08)'], [1, 'rgba(4,18,37,0)']],
};
const NIGHT = {
  bg: [[0, '#4a2a8a'], [0.55, '#21134a'], [1, '#0a0620']],
  glow: [[0, 'rgba(201,160,255,0.3)'], [0.6, 'rgba(120,80,200,0.08)'], [1, 'rgba(10,6,32,0)']],
};

function backdrop(ctx, S, { bg, glow }) {
  const g = ctx.createLinearGradient(0, 0, S, S);
  for (const [at, c] of bg) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const r = ctx.createRadialGradient(S * 0.34, S * 0.24, 0, S * 0.42, S * 0.42, S * 0.72);
  for (const [at, c] of glow) r.addColorStop(at, c);
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, S, S);
}

function paintFace(ctx, S, id) {
  backdrop(ctx, S, TEAL);
  // The icon's ink: a static tile wants one crisp opaque contour, where the game's
  // soft translucent one reads as several misregistered edges (render-icon.js).
  // Put back at once — this runs between frames, and the game draws with the other.
  const was = { ...INK };
  setInk({ body: 0.38, face: 0.42, alpha: 5, brow: 1, browA: 1, browL: 0.15 });
  try {
    drawToonFace(ctx, id, S * 0.05, S * 0.05, S * 0.9, S * 0.9, { light: false });
  } finally {
    setInk(was);
  }
}

function paintFish(ctx, S, fish) {
  backdrop(ctx, S, WATER);
  // a few bubbles rising behind it
  ctx.strokeStyle = 'rgba(210,245,255,0.45)';
  ctx.lineWidth = S * 0.006;
  for (const [x, y, r] of [[0.16, 0.78, 0.03], [0.22, 0.62, 0.018], [0.13, 0.5, 0.012], [0.84, 0.3, 0.022], [0.79, 0.18, 0.014]]) {
    ctx.beginPath();
    ctx.arc(S * x, S * y, S * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  // a touch left and down of centre: what hangs off a fish — the angler's lure, a
  // snorkel, bubbles — goes up and ahead of it; the angler's lure furthest of all
  ctx.translate(S * (fish.name === 'ANGLER' ? 0.42 : 0.47), S * 0.54);
  // a still from mid-swim: tail a little across, lips part-open on the beat; its lines
  // as fine as a hero face's (Peter, 7 Oct 2026), not the club's, which are set off its length
  drawPaperFish(ctx, fish, S * 0.8, { t: 0.4, beat: 0.25, wag: 0.3, lines: FISH_LINES });
  ctx.restore();
}

// How much finer than in the club a fish's lines are drawn on a cover (drawPaperFish `lines`).
const FISH_LINES = 0.25;

// The toaster prop's frame with its wings up (96 frames: a 12-frame wingbeat, the
// toast on the whole cycle).
const TOASTER_FRAME = 3;

function paintToaster(ctx, S, painter) {
  backdrop(ctx, S, NIGHT);
  // a scatter of stars
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [x, y, r] of [[0.12, 0.14, 0.006], [0.3, 0.08, 0.004], [0.82, 0.12, 0.007], [0.9, 0.36, 0.004],
    [0.08, 0.46, 0.004], [0.18, 0.84, 0.005], [0.72, 0.9, 0.004], [0.92, 0.7, 0.006], [0.55, 0.06, 0.003]]) {
    ctx.beginPath();
    ctx.arc(S * x, S * y, S * r, 0, Math.PI * 2);
    ctx.fill();
  }
  // its sprite is 22x18; drawn straight from the vector painter at this size, never
  // through the prop cache, which would keep a picture this big for good
  const w = S * 0.78, h = w * 18 / 22;
  ctx.save();
  ctx.translate((S - w) / 2, (S - h) / 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  PROP_PAINTERS[painter](ctx, w, h, TOASTER_FRAME);
  ctx.restore();
}

// The club's mirror ball, hung on its wire, haloed and twinkling (club.js draws it so).
function paintBall(ctx, S) {
  backdrop(ctx, S, NIGHT);
  const x = S / 2, y = S * 0.54, r = S * 0.3;
  ctx.strokeStyle = 'rgba(200,200,216,0.55)';
  ctx.lineWidth = S * 0.006;
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - r); ctx.stroke();
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.7);
  halo.addColorStop(0, 'rgba(255,255,255,0.24)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill();
  drawDiscoBall(ctx, x, y, r, { t: 0.7, pulse: 0.3, bands: 16 });
  ctx.fillStyle = '#5a5670';
  ctx.fillRect(x - S * 0.012, y - r - S * 0.016, S * 0.024, S * 0.02);
  sparkles(ctx, x, y, r, 0.35, 7, 3);
}

// THE BOLT, the Lab's remake button, caught mid-glint: the shine across its disc and the
// star on its tip (bolt-button.js; club.js's colours).
function paintBolt(ctx, S) {
  backdrop(ctx, S, NIGHT);
  const x = S / 2, y = S / 2, r = S * 0.34;
  const glow = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.6);
  glow.addColorStop(0, 'rgba(201,160,255,0.35)'); glow.addColorStop(1, 'rgba(201,160,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill();
  drawBoltButton(ctx, { x, y, r, u: S * 0.012, alpha: 1, rim: '#f2f3fa', ink: '#f2f3fa', k: 0.5 });
  ctx.globalAlpha = 1;
}

// Painted at twice the size and brought down once with high-quality filtering, so
// curves and the paper's grain come out smooth at the size the lock screen shows.
const SUPERSAMPLE = 2;

function paint(pick, S) {
  const big = document.createElement('canvas');
  big.width = big.height = S * SUPERSAMPLE;
  const bx = big.getContext('2d');
  bx.scale(SUPERSAMPLE, SUPERSAMPLE);
  if (pick.face) paintFace(bx, S, pick.face);
  else if (pick.fish) paintFish(bx, S, pick.fish);
  else if (pick.toaster) paintToaster(bx, S, pick.toaster);
  else if (pick.club === 'ball') paintBall(bx, S);
  else paintBolt(bx, S);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, S, S);
  big.width = big.height = 0;   // let the big one go now rather than with the GC
  return canvas;
}

/**
 * A cabinet's scenery as its stages show it (the style pack's bg(), the gallery's way),
 * from a random stage and a random point along it: the square above the lane, from the
 * top of the sky to the ground line, out of the middle of the frame. Painted straight
 * at size, not supersampled — the frame is already twice the cover's width — into a
 * canvas of the frame's own shape, as the packs' bakes measure the canvas they are on.
 */
function paintScenery(cab, S, random) {
  const k = S / GROUND_Y;
  const frame = document.createElement('canvas');
  frame.width = Math.round(W * k);
  frame.height = Math.round(H * k);
  const g = frame.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  if (cab.id === 'neon') ensureKanaFonts();
  const stageIndex = 1 + Math.floor(random() * 3);
  const progress = random();
  const total = 3000;
  const bc = { stageIndex, progress };
  const pack = getStylePack(cab.style, {});
  pack.bg(g, 4 + random() * 60, progress * total, cab, total, cab.id === 'rhythm' ? { stageIndex, beat: 0 } : bc, 0, bc);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  canvas.getContext('2d').drawImage(frame, Math.round((frame.width - S) / 2), 0, S, S, 0, 0, S, S);
  frame.width = frame.height = 0;
  return canvas;
}

/** A cabinet's scenery cover by its id (CABINETS), for a contact sheet or a test. */
export function paintCabinetArt(id, S = 1024, random = Math.random) {
  const cab = CABINET_BY_ID[id];
  return cab && typeof document !== 'undefined' ? paintScenery(cab, S, random) : null;
}

// ---- THE 8-BIT COVER ------------------------------------------------------------------
//
// Peter, 8 Oct 2026: "can we make our images crt pixelated if 8bit mode is on in the
// jukebox?" A song playing its 8-bit version (`song.eightBit`, the jukebox's nowPlaying)
// wears its cover on the tube the club's room goes on in the Lab's 8-Bit set (club-crt.js):
// cut to cells, every cell snapped to one of a few flat inks, the aperture grille over it,
// the picture screened back up, a little bloom and the tube's falloff to its corners.
//
// The inks are the cover's own, as the club's and the arcade intro's are their worlds'
// (a fixed set turned the club to mud): k-means over its cells, then a farthest-point pass
// so the small things that stand out — an eye, a neon, the toast — keep a colour of their own.

/** Cells across the cover: a face is about forty of them tall, a sprite rather than a blur. */
const COVER_CELLS = 48;
/** Inks by k-means, and the standouts added after. */
const COVER_INKS = 12;
const COVER_STANDOUTS = 4;
// The tube drawn for the cover as it is shown — the lock screen blows a 600px cover up about
// twice — so the grille's stripes are two pixels each, and a JPEG's colour, kept at half
// resolution, does not average them away.
const COVER_SHOWN = 2;
const COVER_VIGNETTE = 0.38;   // the club's, arcadeIntro CRT_SOFT's

// The arcade intro's weighting, as clubCrt matches its inks by.
const inkDistance = (a, b) => {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
};

function coverInks(canvas, n) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, n, n);
  let d;
  try { d = g.getImageData(0, 0, n, n).data; } catch { return null; }
  c.width = c.height = 0;
  const px = [];
  for (let i = 0; i + 3 < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  if (px.length < COVER_INKS + COVER_STANDOUTS) return null;
  // seeded across the cover's brightness, darkest to lightest, so it comes out the same each time
  const lum = (p) => 2 * p[0] + 4 * p[1] + 3 * p[2];
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  let inks = Array.from({ length: COVER_INKS }, (_, i) => [...sorted[Math.floor(((i + 0.5) / COVER_INKS) * sorted.length)]]);
  const nearest = (p) => {
    let best = 0, bd = Infinity;
    for (let j = 0; j < inks.length; j++) {
      const dd = inkDistance(p, inks[j]);
      if (dd < bd) { bd = dd; best = j; }
    }
    return [best, bd];
  };
  for (let pass = 0; pass < 10; pass++) {
    const sum = inks.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      const s = sum[nearest(p)[0]];
      s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    inks = inks.map((ink, j) => (sum[j][3] ? [0, 1, 2].map((ch) => Math.round(sum[j][ch] / sum[j][3])) : ink));
  }
  for (let s = 0; s < COVER_STANDOUTS; s++) {
    let far = null, fd = -1;
    for (const p of px) {
      const dd = nearest(p)[1];
      if (dd > fd) { fd = dd; far = p; }
    }
    if (!far || fd <= 0) break;
    inks.push([...far]);
  }
  return inks;
}

/** `canvas`, an S px cover, put on the tube in place (THE 8-BIT COVER). False if it could not be. */
function tubeCover(canvas) {
  const S = canvas.width;
  const inks = coverInks(canvas, COVER_CELLS);
  const ctx = canvas.getContext('2d');
  if (!inks || typeof ctx.setTransform !== 'function') return false;
  const u = S / COVER_SHOWN;
  ctx.save();
  ctx.setTransform(COVER_SHOWN, 0, 0, COVER_SHOWN, 0, 0);
  const done = clubCrt(ctx, { box: { x: 0, y: 0, w: u, h: u, cell: u / COVER_CELLS }, inks, id: 'cover' });
  ctx.restore();
  if (!done) return false;
  const v = ctx.createRadialGradient(S / 2, S / 2, S * 0.31, S / 2, S / 2, S * 0.77);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${COVER_VIGNETTE})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, S, S);
  return true;
}

let last = null;

/**
 * A cover for the song now playing, S px square, on a canvas of its own: its cabinet's
 * scenery when it is a cabinet's song (`song.cabinet`, the jukebox's nowPlaying), else a
 * subject at random — on the tube when the song is playing its 8-bit version (`song.eightBit`).
 */
export function paintSongArt(S = 1024, random = Math.random, song = null) {
  if (typeof document === 'undefined') return null;
  // DÉJÀ VIEW has no scenery of its own to show: its backdrop is the others' looks cut in on
  // the beat, and a still of it is a dark empty sky. Its song gets a subject like any other.
  const cab = song && song.cabinet && song.cabinet !== 'surge' ? CABINET_BY_ID[song.cabinet] : null;
  let canvas;
  if (cab) {
    canvas = paintScenery(cab, S, random);
    canvas.subject = `cabinet:${cab.id}`;
  } else {
    const pool = SUBJECTS.filter((s) => s.id !== last);
    const pick = pool[Math.floor(random() * pool.length)];
    last = pick.id;
    canvas = paint(pick, S);
    canvas.subject = pick.id;
  }
  canvas.eightBit = !!(song && song.eightBit) && tubeCover(canvas);
  return canvas;
}

/** One subject by id (SONG_ART_SUBJECTS), for a contact sheet or a test; on the tube with `eightBit`. */
export function paintSongArtOf(id, S = 1024, { eightBit = false } = {}) {
  const pick = SUBJECTS.find((s) => s.id === id);
  if (!pick || typeof document === 'undefined') return null;
  const canvas = paint(pick, S);
  canvas.eightBit = eightBit && tubeCover(canvas);
  return canvas;
}

export const SONG_ART_SUBJECTS = SUBJECTS.map((s) => s.id);
