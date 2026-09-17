// Assemble mashenstein.com into work/site/ as ONE self-contained HTML file.
//
// The site's SOURCE is site/ — hand-written HTML, CSS and a small script. This
// tool is the other half: it fills in the artwork and welds the three files
// into a single index.html. Output lands in work/site/, gitignored like
// everything else generated (see CLAUDE.md).
//
//   node tools/build-site.js            -> work/site/index.html
//   node tools/build-site.js --out=DIR  -> somewhere else
//   node tools/build-site.js --og       -> also write og.png (see below)
//   node tools/build-site.js --no-thumb    skip nothing; kept for old habits
//
// ─────────────────────────────────────────────────────── ZERO BITMAPS ─────
//
// There is not a single raster image on this page. The game synthesizes all of
// its own art and audio at runtime and ships no asset files; the site holds the
// same line, so everything here is SVG or CSS. That is not a stunt — it is what
// keeps one HTML file under a hundred kilobytes and sharp on every display.
//
// It costs one thing, and only one: **no link-preview image**. og:image is
// fetched by URL by Facebook, iMessage, Slack, WhatsApp and X, and every one of
// them ignores an SVG (and a data: URI). `--og` writes a 1200x630 og.png beside
// the page and switches the meta tags on; without it a shared link previews as
// title and description only. It is the one deliberate exception, off by
// default, and it is the only thing in here that rasterizes anything.
//
// ──────────────────────────────────────────────── THE SIGN IS THE GAME'S ───
//
// The marquee is not a transcription of the title screen, it is a measurement
// of it. The build runs the game's own text engine in a headless browser
// (src/engine/sprites.js: textWidth for the advances, drawTextCentered for the
// ink), reads back exactly where every glyph and every stitch lands in the
// game's logical 480x270 frame, and emits an SVG that reproduces those numbers.
// Nothing is eyeballed off a screenshot and no metric is hardcoded, so if the
// face, the tracking or TITLE_SCALE ever changes, re-running this moves the
// website's sign with the game's.
//
// The starfield is the same story without the browser: drawRetainedTitleBase's
// sky and drawRetainedTitleStars' ninety stars are pure arithmetic, so they are
// computed here and written out as gradients and circles.
import esbuild from 'esbuild';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const flags = {};
for (const arg of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
}
const OUT = join(root, flags.out || 'work/site');

// Sections written and kept in index.html but switched off. THE RELAY and NINE
// CABINETS are off because their artwork was the one thing on this site that
// could not be vector — a hero comes out of drawToon, which is a canvas painter
// — so under the zero-bitmap rule they would be cards with holes in them. The
// writing is kept; turning one back on means giving it vector art or accepting
// a text-only card. MANAGEMENT has no pictures and can simply come back.
const SECTIONS = { relay: false, cabinets: false, staff: false };

// titleLayout()'s LANDSCAPE branch, quoted from src/game/menus.js. These are
// the only numbers taken by hand rather than measured, because they are the
// composition itself rather than anything the type engine knows.
const W = 480, H = 270;              // src/engine/renderer.js
const TITLE_SCALE = 4.4;             // logoScale
const TITLE_MARQUEE_Y = 20;
const TITLE_SUBTITLE_Y = 67;
const TITLE_PLUG_Y = 88;
// The marquee plate's own box: the logo, the subtitle, and room under it for
// the plug to hang into. index.html overlays the cord on this same box.
const LOGO_BOX_H = 104;

const TRAILER_ID = 'gLMW9TrAgKE';

// ─────────────────────────────────────────────────────────── playwright ───
// Not a runtime dependency of the game. Prefer the repo's own copy and fall
// back to the npx cache, which is where the other art tools find it.
function loadPlaywright() {
  try { return createRequire(join(root, 'package.json'))('playwright'); } catch { /* fall through */ }
  const cached = execFileSync('sh', ['-c',
    'ls -d ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1'],
  { encoding: 'utf8' }).trim();
  if (!cached) {
    console.error('playwright not available — run `npx playwright install chromium` first');
    process.exit(1);
  }
  return createRequire(join(cached, 'package.json'))(join(cached, 'index.js'));
}

// ────────────────────────────────────────────── measuring the game's type ──
const ENTRY = `
import { drawTextCentered, textWidth, GLYPH_PX } from '${join(root, 'src/engine/sprites.js').replace(/\\/g, '/')}';
import { drawToon, TOON_SPECS, setInkScale, setInkDensity } from '${join(root, 'src/sprites/toons.js').replace(/\\/g, '/')}';
import { SvgRecorder } from '${join(root, 'tools/lib/canvas-to-svg.js').replace(/\\/g, '/')}';

// GARY, AS VECTOR. drawToon is a canvas painter, and a canvas painter's output
// is a bitmap — which this site does not have. So he is drawn once here into an
// SvgRecorder, a context that writes SVG paths instead of pixels, and ships as
// a few kilobytes of vector drawn by the game's own code. Change his spec in
// toons.js and re-running the build moves him here too.
const GARY_W = 300, GARY_H = 400, GARY_DRAW_H = 300;
const GARY_POSE = {
  kind: 'idle', phase: 0, time: 0, vy: 0, grounded: true, squash: 0, lean: 0,
  roll: false, float: false, stomp: false, headless: false, facing: 1,
};

function recordGary(spec, time, facing) {
  const r = new SvgRecorder();
  setInkDensity(2);
  setInkScale(2);
  drawToon(r, 'gary', { ...GARY_POSE, time, facing }, GARY_W / 2, GARY_H - 20, GARY_DRAW_H, spec ? { spec } : {});
  return r;
}

// HE IS DRAWN BOTH WAYS ROUND, rather than drawn once and mirrored with a CSS
// scaleX(-1). Turning him with the painter's own facing flag is not the same
// operation as flipping the picture: drawToon moves his name tag to the other
// side of his chest (x 157.7 becomes 115.3), and re-decides which arm is in
// front and how the hat and hair sit. A mirror gets the tag's new side by
// accident and everything else wrong — which is what made him look subtly off
// at the right-hand entrances.
function recordFacing(facing) {
  const open = recordGary(null, BLINK_OPEN_T, facing);
  const shut = recordGary(null, BLINK_SHUT_T, facing);
  const without = recordGary({ ...TOON_SPECS.gary, nameTag: false }, BLINK_OPEN_T, facing);

  const eOpen = eyeRange(open.out);
  const eShut = eyeRange(shut.out);
  const blinkable = eOpen && eShut && eOpen.balanced && eShut.balanced;

  const parts = blinkable
    ? [
      ...open.out.slice(0, eOpen.from),
      '<g class="eyes-open">', ...eOpen.slice, '</g>',
      '<g class="eyes-shut">', ...eShut.slice, '</g>',
      ...open.out.slice(eOpen.to),
    ]
    : open.out;

  return {
    defs: open.markup().defs + shut.markup().defs,
    body: parts.join(''),
    tag: tagBox(open, without),
    blinkable,
    eyes: blinkable ? { open: eOpen.slice.length, shut: eShut.slice.length } : null,
  };
}

const normIds = (el) => el.replace(/url\\(#[gc]\\d+\\)/g, 'url(#X)').replace(/id="[gc]\\d+"/g, 'id="X"');

function boxOf(el) {
  const d = /d="([^"]+)"/.exec(el);
  if (!d) return null;
  const pts = [...d[1].matchAll(/(-?\\d+(?:\\.\\d+)?)\\s+(-?\\d+(?:\\.\\d+)?)/g)].map((m) => [+m[1], +m[2]]);
  if (!pts.length) return null;
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// The eye block, as a RANGE of emitted elements rather than a set of them: the
// eyes come with their own clip wrappers, and lifting the paths out while
// leaving the <g> behind would both unbalance the markup and change draw order.
// First and last element whose ink lands in the eye band, everything between
// them included.
const EYE_BAND = { y0: 118, y1: 178, x0: 105, x1: 200 };
function eyeRange(out) {
  const hit = [];
  out.forEach((el, i) => {
    const b = boxOf(el);
    if (b && b.y0 > EYE_BAND.y0 && b.y1 < EYE_BAND.y1 && b.x0 > EYE_BAND.x0 && b.x1 < EYE_BAND.x1) hit.push(i);
  });
  if (!hit.length) return null;
  const from = hit[0], to = hit[hit.length - 1] + 1;
  const slice = out.slice(from, to);
  // A slice that opens more groups than it closes would break the document.
  const open = slice.filter((e) => /^<g[\\s>]/.test(e)).length;
  const close = slice.filter((e) => e === '</g>').length;
  return { from, to, slice, balanced: open === close };
}

// Where his name tag is, found rather than guessed. The tag is a blank rounded
// rect in toons.js with no lettering — at gameplay scale it is about two pixels
// across, so type there would be a smudge — but here he is big enough to read.
// Rather than hunt for the right path by its shape, draw him twice, once with
// nameTag off, and diff: what only the first drawing has IS the tag.
function tagBox(withTag, without) {
  const bag = new Map();
  for (const el of without.out.map(normIds)) bag.set(el, (bag.get(el) || 0) + 1);
  const extra = [];
  for (const el of withTag.out) {
    const k = normIds(el);
    if (bag.get(k)) bag.set(k, bag.get(k) - 1); else extra.push(el);
  }
  const nums = [];
  for (const el of extra) {
    const b = boxOf(el);
    if (b) nums.push(b);
  }
  if (!nums.length) return null;
  const x = Math.min(...nums.map((b) => b.x0));
  const y = Math.min(...nums.map((b) => b.y0));
  return {
    x, y,
    w: Math.max(...nums.map((b) => b.x1)) - x,
    h: Math.max(...nums.map((b) => b.y1)) - y,
    paths: extra.length,
  };
}

// Gary's blink fires when (time + FACE_SEED.gary, 0.8) wraps a gap of
// 3.6 + 0.8*0.11 seconds, and lasts 0.13 of one. The window therefore opens at
// 2.888s — so these two times are 90ms apart, one just before it and one just
// inside it. They are that close on purpose: the time drives the idle body as
// well as the face, and over 90ms the body moves 0.57 of a unit in 400, which
// is well under a pixel at any size he is drawn here. Nothing else in the
// drawing repeats, so there is no pair of times that share a body exactly.
const BLINK_OPEN_T = 2.86;
const BLINK_SHUT_T = 2.95;

window.recordGarySvg = () => {
  const right = recordFacing(1);
  const left = recordFacing(-1);
  return { right, left, w: GARY_W, h: GARY_H };
};

// SVG sets type from a BASELINE; the game sets it from the top of the em box,
// through a per-style normalization (normalizedTextY / inkMetrics) that is
// private to sprites.js. Rather than reimplement that — which is exactly the
// kind of copy that goes quietly stale — measure the finished result: draw the
// string the way the game draws it, find the top row of ink, and ask the same
// font how far its ink top sits above the baseline. The difference is the
// baseline, exactly, whatever the normalization did on the way.
function inkTopAndLeft(str, scale, style, box) {
  const ss = 8;                                   // measure at 8x for precision
  const c = document.createElement('canvas');
  c.width = Math.ceil(box.w * ss);
  c.height = Math.ceil(box.h * ss);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.setTransform(ss, 0, 0, ss, 0, 0);
  drawTextCentered(x, str, box.w / 2, box.y, '#ffffff', scale, style);
  const data = x.getImageData(0, 0, c.width, c.height).data;
  let top = -1, left = -1;
  for (let row = 0; row < c.height && top < 0; row++) {
    for (let col = 0; col < c.width; col++) {
      if (data[(row * c.width + col) * 4 + 3] > 16) { top = row / ss; break; }
    }
  }
  for (let col = 0; col < c.width && left < 0; col++) {
    for (let row = 0; row < c.height; row++) {
      if (data[(row * c.width + col) * 4 + 3] > 16) { left = col / ss; break; }
    }
  }
  return { top, left };
}

// Everything the emitter needs about one string, in the game's logical units.
// The per-glyph advance is textWidth of that glyph plus the style's tracking,
// which is how drawText itself walks the cursor (see drawTextVector).
window.measureString = ({ str, scale, style, y, tracking, weight, family, boxW, boxH }) => {
  const fontPx = GLYPH_PX * scale;
  const total = textWidth(str, scale, style);

  const ink = inkTopAndLeft(str, scale, style, { w: boxW, h: boxH, y });

  // How far this face's ink top sits above its alphabetic baseline, at this
  // size. actualBoundingBox is the INK box, which is what was just measured on
  // the canvas, so the two are the same quantity and subtract cleanly.
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = \`\${weight} \${fontPx}px \${family}\`;
  probe.textBaseline = 'alphabetic';
  const m = probe.measureText(str);

  const glyphs = [];
  let cx = boxW / 2 - total / 2;
  for (const ch of str) {
    if (ch !== ' ') glyphs.push({ ch, x: +cx.toFixed(3) });
    cx += textWidth(ch, scale, style) + tracking;
  }
  // The measured ink starts at the first glyph's left SIDE BEARING, not at its
  // origin; shifting the whole line by that difference would double-count it.
  const bearing = m.actualBoundingBoxLeft ? -m.actualBoundingBoxLeft : 0;
  return {
    fontPx: +fontPx.toFixed(4),
    width: +total.toFixed(3),
    baseline: +(ink.top + m.actualBoundingBoxAscent).toFixed(3),
    inkTop: +ink.top.toFixed(3),
    dx: +((glyphs[0].x + bearing) - ink.left).toFixed(3),
    glyphs,
  };
};
`;

const bundle = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: root, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();

// The faces have to be in before a single glyph is measured: sprites.js caches
// each glyph's advance on first measurement, so a string measured before the
// face lands is not merely spaced for Trebuchet, it stays that way for the life
// of the page. Same stylesheet and face list the boot gate uses.
await page.setContent(`<!doctype html><html><head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400..600&family=Permanent+Marker&display=swap">
  </head><body style="margin:0"></body></html>`, { waitUntil: 'load' });
const faces = ["400 32px 'Lilita One'", "500 12px 'Fredoka'", "600 12px 'Fredoka'"];
const fontsOk = await page.evaluate(async (list) => {
  await Promise.all(list.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  return list.every((f) => document.fonts.check(f));
}, faces);
if (!fontsOk) {
  console.error('the webfonts did not land — the sign would set in Trebuchet. Aborting.');
  await browser.close();
  process.exit(1);
}
await page.addScriptTag({ content: bundle.outputFiles[0].text });

// TEXT_STYLES in sprites.js: 'marquee' is Lilita One 400 with a fixed 0.5 of
// tracking and a 1-unit dark outline baked into every glyph; 'subtitle' is
// Fredoka 600 with a fixed tracking of 3.
const FALLBACK = "'Trebuchet MS','Segoe UI',system-ui,sans-serif";
const marquee = await page.evaluate((a) => window.measureString(a), {
  str: 'MASHENSTEIN', scale: TITLE_SCALE, style: 'marquee', y: TITLE_MARQUEE_Y,
  tracking: 0.5, weight: 400, family: `'Lilita One',${FALLBACK}`, boxW: W, boxH: LOGO_BOX_H,
});
const subtitle = await page.evaluate((a) => window.measureString(a), {
  str: 'THE UNPLUGGENING', scale: 1, style: 'subtitle', y: TITLE_SUBTITLE_Y,
  tracking: 3, weight: 600, family: `'Fredoka',${FALLBACK}`, boxW: W, boxH: LOGO_BOX_H,
});

const gary = await page.evaluate(() => window.recordGarySvg());
for (const [way, take] of [['facing right', gary.right], ['facing left', gary.left]]) {
  if (!take.body || !take.tag || take.tag.paths !== 2) {
    throw new Error(`Gary ${way} did not record cleanly (${take.tag ? take.tag.paths : 0} name-tag paths, expected 2)`);
  }
  if (!take.blinkable) throw new Error(`Gary ${way}: the eye block could not be isolated — he would not blink`);
}
// The turn is only worth its bytes if the painter really did move the tag.
if (Math.abs(gary.right.tag.x - gary.left.tag.x) < 5) {
  throw new Error('Gary\'s name tag did not move when he turned — the second recording is redundant');
}

let ogPng = null;
if (flags.og) ogPng = await renderOgCard(page);
await browser.close();

for (const [name, m] of [['MASHENSTEIN', marquee], ['THE UNPLUGGENING', subtitle]]) {
  if (!(m.width > 0) || !(m.baseline > 0) || !m.glyphs.length) {
    throw new Error(`could not measure '${name}' — the sign would ship empty`);
  }
}

// ──────────────────────────────────────────────────────────── the sign ────
const n = (v) => +Number(v).toFixed(3);

function glyphRun(m, cls) {
  return m.glyphs
    .map((g) => `<text class="${cls}" x="${n(g.x + m.dx)}" y="${n(m.baseline)}">${g.ch}</text>`)
    .join('');
}

// drawRetainedMarquee: MASHENSTEIN in warm cartoon gold over its own #a8791f
// shadow at +1.5, stitched together out of parts by six cross-stitches at
// sixths of the MEASURED width, then THE UNPLUGGENING under it.
const seamK = TITLE_SCALE / 4;
const seamTop = TITLE_MARQUEE_Y + 4 * seamK;
const seamBot = TITLE_MARQUEE_Y + 22 * seamK;
const seamLeft = W / 2 - marquee.width / 2;
const stitches = Array.from({ length: 6 }, (_, i) => {
  const sx = seamLeft + (marquee.width * (i + 0.5)) / 6 - 4;
  return `<path d="M${n(sx)} ${n(seamTop)}L${n(sx + 8)} ${n(seamBot)}M${n(sx + 8)} ${n(seamTop)}L${n(sx)} ${n(seamBot)}"/>`;
}).join('');

// font-size rides on the group rather than in the stylesheet: it is a MEASURED
// quantity (GLYPH_PX x the style's scale, what fontString hands the canvas),
// and a number the CSS picked would be the one thing on this sign that was not
// the game's.
const logoSvg = `<svg class="logo" viewBox="0 0 ${W} ${LOGO_BOX_H}" aria-hidden="true">`
  + `<g class="wm-shadow" font-size="${marquee.fontPx}" transform="translate(1.5 1.5)">${glyphRun(marquee, 'wm')}</g>`
  + `<g class="wm-face" font-size="${marquee.fontPx}">${glyphRun(marquee, 'wm')}</g>`
  + `<g class="wm-seam">${stitches}</g>`
  + `<g class="wm-sub" font-size="${subtitle.fontPx}">${glyphRun(subtitle, 'sub')}</g>`
  + '</svg>';

// A live power cord dangles off the logo. The anchor tracks the MEASURED width,
// exactly as titleScene does — hardcode it and the cord dangles in mid air the
// first time the lettering changes. plugK is logoScale / TITLE_SCALE, which in
// the landscape layout is 1, so the game's constants apply here unscaled.
const ax = W / 2 + marquee.width / 2 - 5 * seamK;
const ay = TITLE_MARQUEE_Y + 24 * seamK;
const py = TITLE_PLUG_Y;
const cordSvg = `<svg class="cord" viewBox="0 0 ${W} ${LOGO_BOX_H}" aria-hidden="true">`
  + `<g style="transform-origin:${n(ax)}px ${n(ay)}px">`
  + `<path d="M${n(ax)} ${n(ay)}L${n(ax)} ${n(py)}"/>`
  + `<circle cx="${n(ax)}" cy="${n(ay)}" r="2.2"/>`
  + `<rect class="plug" x="${n(ax - 3)}" y="${py}" width="6" height="8" rx="0.8"/>`
  + `<rect class="prong" x="${n(ax - 2)}" y="${py + 8}" width="1.6" height="3"/>`
  + `<rect class="prong" x="${n(ax + 0.6)}" y="${py + 8}" width="1.6" height="3"/>`
  + '</g></svg>';

// ───────────────────────────────────────────────────────────── the sky ────
// menus.js' own value-noise hash, so the stars land where the game puts them.
function shaderHash21(x, y) {
  let px = ((x * 123.34) % 1 + 1) % 1;
  let py = ((y * 456.21) % 1 + 1) % 1;
  const d = px * (px + 45.32) + py * (py + 45.32);
  px += d; py += d;
  const v = px * py;
  return v - Math.floor(v);
}

// drawRetainedTitleBase's 'canvas' sky plus drawRetainedTitleStars' stars.
//
// TWO DEPARTURES FROM THE GAME, both deliberate.
//
// The sky runs the full height rather than stopping at the horizon, because
// there is no parade standing on a floor here.
//
// The SIZE of a star is left exactly alone, and so is everything else about it:
// the sky's viewBox is the game's own 480x270, so on a 1440-wide window it
// scales by 3 and every star is the size, colour and brightness the game draws
// it at.

// THE SKY IS THE SHADER'S, NOT THE FALLBACK'S.
//
// menus.js draws stars two ways. drawRetainedTitleStars — ninety dots pulsed in
// three slow layers — is the CANVAS FALLBACK, used only when WebGL is missing.
// What the game actually shows is skyColor() in src/engine/glfx.js, and the two
// look nothing alike. Copying the fallback is why this sky sat there.
//
// What the shader does differently, in the order it matters:
//
//   EVERY STAR TWINKLES ON ITS OWN CLOCK. tw = 0.30 + 0.70 * pow(...)^2, on a
//   rate of 1.1 + 4.0*fract(h*17) radians a second and a phase of h*44 — both
//   derived from that star's own hash. So rates run from 0.6s to 2.9s per
//   swing, no two stars agree, and the squaring holds each one dim for most of
//   its cycle and then spikes it. That is the shimmer. The fallback instead
//   fades a THIRD of the sky at once between 0.62 and 0.90, which is a change
//   the eye adapts to rather than notices.
//
//   THE STARS ARE ON A GRID, not scattered: three layers at cell scales 34, 22
//   and 13, one cell in four holding a star (h >= 0.74) jittered inside it, at
//   brightness 0.40, 0.75 and 1.15. That is ~840 stars, not ninety.
//
//   THEY FADE TOWARD THE FLOOR — depth = smoothstep(0.85, 0.05, sy) — so the
//   field is dense overhead and gone by the horizon.
//
//   AND THERE IS A SHOOTING STAR every 6.5 seconds, in roughly half the
//   windows, across the top of the sky.
//
// Two things in the shader are deliberately NOT reproduced: the three layers
// drift sideways at 1-2px a second and the nebula at 3px, which over a visit to
// a web page is motion nobody can see, and paying for it here means duplicating
// every drifting layer so it can wrap seamlessly.
// The shader's field sits behind a busy title screen — a logo, four cards and
// eight heroes — and is lit for that. Full-bleed behind a page of reading it is
// simply too bright, so the whole field is knocked back by one number rather
// than by re-lighting each layer, which would be inventing rather than dimming.
const SKY_GAIN = 0.5;
const NEB_GAIN = 0.55;

const LAYERS = [
  { scale: 34, seed: 0, bright: 0.40 },
  { scale: 22, seed: 1, bright: 0.75 },
  { scale: 13, seed: 2, bright: 1.15 },
];

// The shader squares up the aspect with `vec2 p = vec2(uv.x * 1.778, uv.y)`, so
// one unit of p is H pixels in both directions and a cell is square.
const ASPECT = 1.778;
const PU = H;                      // pixels per unit of p

// Star colour: mix(vec3(0.70,0.80,1.0), vec3(1.0,0.85,0.60), mag). Quantized
// into a handful of gradients — at this many stars the steps are invisible, and
// one gradient per star would be one <defs> entry per star.
const TINTS = 5;
const tintRgb = (k) => {
  const m = TINTS === 1 ? 0 : k / (TINTS - 1);
  const ch = (a, b) => Math.round((a + (b - a) * m) * 255);
  return `${ch(0.70, 1.0)},${ch(0.80, 0.85)},${ch(1.0, 0.60)}`;
};

// core + halo^3, the shader's own falloff: a hard point with a soft bloom.
const starGrads = Array.from({ length: TINTS }, (_, k) => {
  const rgb = tintRgb(k);
  return `<radialGradient id="t${k}">`
    + `<stop offset="0" stop-color="rgb(${rgb})" stop-opacity="1"/>`
    + `<stop offset=".09" stop-color="rgb(${rgb})" stop-opacity=".92"/>`
    + `<stop offset=".2" stop-color="rgb(${rgb})" stop-opacity=".3"/>`
    + `<stop offset=".5" stop-color="rgb(${rgb})" stop-opacity=".07"/>`
    + `<stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`;
}).join('');

// tw = 0.30 + 0.70 * u^2 where u = (1 - cos(pi*s))/2 across a half cycle. Held
// dim, then spiked — emitted as stops because a CSS easing curve shapes TIME,
// and this shapes VALUE.
const twKeyframes = '@keyframes tw{' + Array.from({ length: 9 }, (_, i) => {
  const s = i / 8;
  const u = (1 - Math.cos(Math.PI * s)) / 2;
  return `${(s * 100).toFixed(1)}%{opacity:${(0.3 + 0.7 * u * u).toFixed(3)}}`;
}).join('') + '}';

// Rate and phase are per star in the shader. Quantizing each into buckets buys
// a class name per star instead of an inline animation on every one.
const RATES = 12, PHASES = 8;
const W_MIN = 1.1, W_MAX = 5.1;                       // 1.1 + 4.0 * fract(h*17)
const rateCss = [];
for (let r = 0; r < RATES; r++) {
  const w = W_MIN + (W_MAX - W_MIN) * ((r + 0.5) / RATES);
  const half = Math.PI / w;                            // seconds per swing
  for (let q = 0; q < PHASES; q++) {
    const delay = -(2 * half) * (q / PHASES);
    rateCss.push(`.sky .k${r}_${q}{animation:tw ${half.toFixed(2)}s linear ${delay.toFixed(2)}s infinite alternate}`);
  }
}
rateCss.push('@media(prefers-reduced-motion:reduce){.sky circle,.sky .spike{animation:none;opacity:.72}}');

const stars = [];
for (const { scale, seed, bright } of LAYERS) {
  const cellPx = PU / scale;
  const cols = Math.ceil(ASPECT * scale) + 1;
  const rows = scale + 1;
  for (let iy = -1; iy < rows; iy++) {
    for (let ix = -1; ix < cols; ix++) {
      const h = shaderHash21(ix + seed, iy + seed);
      if (h < 0.74) continue;                          // step(0.74, h)
      const ox = (shaderHash21(ix + 3.13, iy + 3.13) - 0.5) * 0.66;
      const oy = (shaderHash21(ix + 7.77, iy + 7.77) - 0.5) * 0.66;
      // cell centre back out of grid space, minus the shader's seed offset
      const gx = ix + 0.5 + ox - seed * 13.7;
      const gy = iy + 0.5 + oy - seed * 13.7;
      const px = ((gx / scale) / ASPECT) * W;
      const py = (gy / scale) * H;
      if (px < -8 || px > W + 8 || py < -8 || py > H + 8) continue;
      const mag = (h * 91) % 1;
      const tint = Math.min(TINTS - 1, Math.floor(mag * TINTS));
      const rate = Math.min(RATES - 1, Math.floor(((h * 17) % 1) * RATES));
      const phase = Math.floor((((h * 44) / (2 * Math.PI)) % 1) * PHASES) % PHASES;
      const r = 0.34 * cellPx;                         // halo reaches 0.34 cell
      const cls = `k${rate}_${phase}`;
      const g = `<g class="${cls}" opacity="${n(Math.min(1, bright))}">`;
      let body = `<circle cx="${n(px)}" cy="${n(py)}" r="${n(r)}" fill="url(#t${tint})"/>`;
      // the diffraction cross, on the brightest quarter only
      if (mag >= 0.72) {
        const L = r * 2.6, t2 = Math.max(0.12, cellPx * 0.03);
        body += `<rect class="spike" x="${n(px - L)}" y="${n(py - t2 / 2)}" width="${n(L * 2)}" height="${n(t2)}" fill="rgb(${tintRgb(tint)})" opacity=".2"/>`
          + `<rect class="spike" x="${n(px - t2 / 2)}" y="${n(py - L)}" width="${n(t2)}" height="${n(L * 2)}" fill="rgb(${tintRgb(tint)})" opacity=".2"/>`;
      }
      stars.push(g + body + '</g>');
    }
  }
}

// depth = smoothstep(0.85, 0.05, sy): full overhead, gone by the horizon.
const depthMask = '<linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">'
  + '<stop offset="0" stop-color="#fff"/><stop offset=".05" stop-color="#fff"/>'
  + '<stop offset=".45" stop-color="#fff" stop-opacity=".62"/>'
  + '<stop offset=".85" stop-color="#000"/></linearGradient>'
  + '<mask id="depthmask"><rect width="' + W + '" height="' + H + '" fill="url(#depth)"/></mask>';

// The nebula: the shader counter-drifts two fbm fields and tints the result
// teal into violet. Turbulence is the closest thing SVG has to fbm, and at 3px
// a second the drift is not what anyone is looking at.
const nebDefs = '<filter id="neb" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
  + '<feTurbulence type="fractalNoise" baseFrequency="0.0115" numOctaves="4" seed="3" result="n"/>'
  + '<feColorMatrix in="n" type="matrix" values="0 0.10 0 0 0.05  0.16 0 0.05 0 0.03  0.20 0 0.22 0 0.06  0 0 0.9 0 -0.42"/>'
  + '</filter>';

// One streak every 6.5s across the upper sky, as the shader does it.
const shootSvg = '<g class="shoot" aria-hidden="true">'
  + `<rect x="${n(W * -0.16)}" y="${n(H * 0.16)}" width="${n(W * 0.19)}" height="1.1" rx=".55" fill="url(#streak)"/></g>`;
const streakGrad = '<linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">'
  + '<stop offset="0" stop-color="#d9ebff" stop-opacity="0"/>'
  + '<stop offset="1" stop-color="#f2f7ff" stop-opacity="1"/></linearGradient>';
// 6.5s window, a streak across about a fifth of it, dead the rest of the time.
const shootCss = '@keyframes shoot{0%{transform:translate(0,0);opacity:0}'
  + '2%{opacity:1}18%{opacity:1}'
  + `20%{transform:translate(${n(W * 1.25)}px,${n(H * 0.5)}px);opacity:0}`
  + `100%{transform:translate(${n(W * 1.25)}px,${n(H * 0.5)}px);opacity:0}}`
  + '.sky .shoot{animation:shoot 6.5s linear infinite}'
  + '@media(prefers-reduced-motion:reduce){.sky .shoot{display:none}}';

const starLayers = `<g mask="url(#depthmask)" opacity="${SKY_GAIN}">${stars.join('')}</g>${shootSvg}`;
const curveCss = twKeyframes;
const layerCss = rateCss.concat([shootCss]);

// The shader's own gradient, sampled off its two mixes:
//   mix(#07070F, #141026, smoothstep(0, .65, sy)) then toward #1C1430.
const skySvg = `<svg class="sky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>`
  + '<linearGradient id="sky-g" x1="0" y1="0" x2="0" y2="1">'
  + '<stop offset="0" stop-color="#07070f"/><stop offset=".1625" stop-color="#090813"/>'
  + '<stop offset=".325" stop-color="#0d0b1b"/><stop offset=".4875" stop-color="#120e22"/>'
  + '<stop offset=".65" stop-color="#141026"/><stop offset=".825" stop-color="#18122b"/>'
  + '<stop offset="1" stop-color="#1c1430"/></linearGradient>'
  + streakGrad + starGrads + nebDefs + depthMask
  + `</defs><style>${curveCss}${layerCss.join('')}</style>`
  + `<rect width="${W}" height="${H}" fill="url(#sky-g)"/>`
  + `<g mask="url(#depthmask)" opacity="${NEB_GAIN}"><rect width="${W}" height="${H}" filter="url(#neb)"/></g>`
  + starLayers + '</svg>';

// ───────────────────────────────────────────────────────────── gary ──────
// He peeks in over the edge of the window, drawn both ways round so the CSS can
// turn him rather than mirror him. His name tag finally says something: the
// lettering goes on here rather than in toons.js because in the game the tag is
// about two logical pixels wide — type on it would be a smudge, which is
// exactly why it was left blank — and on a 400px Gary it reads.
const garyFace = (take, cls) => {
  const tag = take.tag;
  return `<g class="${cls}">${take.body}`
    + `<text class="gary-tag" x="${n(tag.x + tag.w / 2)}" y="${n(tag.y + tag.h * 0.72)}"`
    + ` textLength="${n(tag.w * 0.84)}" lengthAdjust="spacingAndGlyphs"`
    + ` font-size="${n(tag.h * 0.66)}">GARY</text></g>`;
};
const garySvg = `<svg class="gary" viewBox="0 0 ${gary.w} ${gary.h}" aria-hidden="true">`
  + `<defs>${gary.right.defs}${gary.left.defs}</defs>`
  + garyFace(gary.right, 'face-r')
  + garyFace(gary.left, 'face-l')
  + '</svg>';

// ───────────────────────────────────────────────────────── the favicon ────
// One tab-sized drawing, and the only thing on the page small enough that a
// character would be a smudge: the plug off the end of the sign, on the
// marquee's own gold.
const favicon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
  + '<rect width="32" height="32" rx="7" fill="#0b0b18"/>'
  + '<path d="M16 5v9" stroke="#ffcf33" stroke-width="3" stroke-linecap="round"/>'
  + '<rect x="9" y="14" width="14" height="9" rx="2" fill="#ffcf33"/>'
  + '<rect x="12" y="23" width="3" height="5" rx="1.2" fill="#ffcf33"/>'
  + '<rect x="17" y="23" width="3" height="5" rx="1.2" fill="#ffcf33"/></svg>');

// ─────────────────────────────────────────────── the link-preview card ────
// The one rasterizer, and only with --og. See the ZERO BITMAPS note up top.
async function renderOgCard(pg) {
  const url = await pg.evaluate(([logo, sky, cord]) => {
    const W2 = 1200, H2 = 630;
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:0;top:0;width:${W2}px;height:${H2}px`;
    host.innerHTML = `<div style="position:relative;width:100%;height:100%;overflow:hidden;background:#04050e">`
      + `<div style="position:absolute;inset:0">${sky}</div>`
      + `<div style="position:absolute;left:8%;right:8%;top:26%">`
      + `<div style="position:relative;aspect-ratio:480/104">${logo}${cord}</div></div></div>`;
    document.body.appendChild(host);
    return null;
  }, [logoSvg, skySvg, cordSvg]);
  void url;
  const shot = await pg.locator('body > div').last().screenshot({ type: 'png' });
  return shot;
}

// ───────────────────────────────────────────────────────── assemble it ────
function must(haystack, needle, what) {
  if (!haystack.includes(needle)) throw new Error(`index.html is missing ${what} (${needle})`);
}

let html = readFileSync(join(root, 'site/index.html'), 'utf8');
const css = readFileSync(join(root, 'site/style.css'), 'utf8');
const js = readFileSync(join(root, 'site/site.js'), 'utf8');

for (const [needle, what] of [
  ['/*CSS*/', 'the stylesheet slot'],
  ['/*JS*/', 'the script slot'],
  ['<!--SKY-->', 'the starfield slot'],
  ['<!--LOGO-->', 'the wordmark slot'],
  ['<!--CORD-->', 'the cord slot'],
  ['FAVICON_SVG', 'the favicon slot'],
  ['<!--GARY-->', 'the Gary slot'],
]) must(html, needle, what);

html = html.replace('/*CSS*/', () => css);
html = html.replace('/*JS*/', () => js);
html = html.replace('<!--SKY-->', () => skySvg);
html = html.replace('<!--LOGO-->', () => logoSvg);
html = html.replace('<!--CORD-->', () => cordSvg);
html = html.replace('<!--GARY-->', () => garySvg);
html = html.replace('FAVICON_SVG', () => favicon);

// Sections that are switched off get the `hidden` attribute, which is all it
// takes — no CSS, and nothing is downloaded for them because there is nothing
// to download. Asserted, because a silently-missed section ships a page with a
// half-written cast list on it.
for (const [name, on] of Object.entries(SECTIONS)) {
  if (on) continue;
  const tag = `<section id="${name}"`;
  must(html, tag, `the ${name} section`);
  html = html.replace(tag, `${tag} hidden`);
}

// og:image points at a file that only exists with --og, so the tags come out
// unless it was asked for; a preview card that 404s is worse than none.
if (!ogPng) {
  const before = html;
  html = html.replace(/^.*(?:og:image|twitter:image).*\n/gm, '');
  if (html === before) throw new Error('expected og:image meta tags to remove');
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
console.log(`  index.html  ${kb(Buffer.byteLength(html))}   (one file, no bitmaps)`);
console.log(`    sign      ${marquee.glyphs.length} glyphs, ${n(marquee.width)}u wide, measured`);
console.log(`    sky       ${stars.length} stars on ${LAYERS.length} grids, each twinkling on its own clock (glfx skyColor)`);
console.log(`    gary      ${(Buffer.byteLength(garySvg) / 1024).toFixed(1)} KB of vector from drawToon, drawn facing both ways, name tag lettered, blinks`);
if (ogPng) {
  writeFileSync(join(OUT, 'og.png'), ogPng);
  console.log(`  og.png      ${kb(ogPng.length)}   (the one raster, --og)`);
} else {
  console.log('  og.png      not written — shared links preview as text (pass --og)');
}
console.log(`\n${OUT}\n  preview: python3 -m http.server -d work/site 8020`);
