// A Canvas2D context that writes SVG instead of pixels.
//
// The game's characters are canvas painters — drawToon and friends draw with
// moveTo/bezierCurveTo/fill/stroke and nothing else. That is fine for a game
// and no use at all to a website that has sworn off bitmaps: a PNG of Gary is a
// bitmap however it was made, and shipping the painter itself costs 232 KB of
// minified JavaScript, most of it the seven heroes you did not ask for.
//
// So: hand the painter a context that records rather than rasterizes, run it
// once at build time, and emit what it drew as SVG paths. Gary arrives as a few
// kilobytes of vector, drawn by the game's own code, sharp at any size, and
// animatable with CSS. Nothing is traced by hand and nothing can drift — change
// his spec in toons.js and re-running the build moves the website's Gary too.
//
// WHAT IS SUPPORTED is exactly what the toon painters use, no more, which is
// the whole reason this is ~200 lines rather than a library:
//
//   path      moveTo lineTo bezierCurveTo quadraticCurveTo arc arcTo ellipse
//             rect closePath beginPath
//   paint     fill stroke clip
//   state     save restore, fillStyle strokeStyle lineWidth lineCap lineJoin
//   transform translate scale
//   gradients createLinearGradient createRadialGradient
//
// Anything else throws rather than silently drawing nothing, so a painter that
// grows a new call fails the build instead of shipping a Gary with a hole in
// him. Every point is baked through the current transform as it is recorded, so
// the SVG comes out flat — no nested <g transform>, which keeps it small and
// keeps CSS animation on the outside where it belongs.

const TAU = Math.PI * 2;

// ── affine helpers ──────────────────────────────────────────────────────────
const IDENT = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
// One number for "how much has this transform scaled things", which is what a
// stroke width and a radial gradient's radius both need. The painters only ever
// scale uniformly, so the square root of the determinant is exact rather than
// an approximation.
const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

const round = (v) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

// ── gradients ───────────────────────────────────────────────────────────────
let gradSeq = 0;
class Gradient {
  constructor(kind, coords, matrix) {
    this.kind = kind;
    this.coords = coords;
    this.matrix = matrix;
    this.stops = [];
    this.id = `g${gradSeq++}`;
  }

  addColorStop(offset, color) { this.stops.push([offset, color]); return this; }

  // Baked into user space at the moment the gradient was created, matching
  // canvas semantics: a gradient's coordinates are fixed by the transform in
  // force when it was made, not the one in force when it is painted.
  toDef() {
    const m = this.matrix;
    const stops = this.stops
      .map(([o, c]) => `<stop offset="${round(o)}" stop-color="${c}"/>`)
      .join('');
    if (this.kind === 'linear') {
      const [x0, y0, x1, y1] = this.coords;
      const [ax, ay] = apply(m, x0, y0);
      const [bx, by] = apply(m, x1, y1);
      return `<linearGradient id="${this.id}" gradientUnits="userSpaceOnUse"`
        + ` x1="${round(ax)}" y1="${round(ay)}" x2="${round(bx)}" y2="${round(by)}">${stops}</linearGradient>`;
    }
    const [x0, y0, r0, x1, y1, r1] = this.coords;
    const k = scaleOf(m);
    const [fx, fy] = apply(m, x0, y0);
    const [cx, cy] = apply(m, x1, y1);
    return `<radialGradient id="${this.id}" gradientUnits="userSpaceOnUse"`
      + ` fx="${round(fx)}" fy="${round(fy)}" fr="${round(r0 * k)}"`
      + ` cx="${round(cx)}" cy="${round(cy)}" r="${round(r1 * k) || 0.01}">${stops}</radialGradient>`;
  }
}

const paintRef = (v) => (v instanceof Gradient ? `url(#${v.id})` : v);

// ── the recorder ────────────────────────────────────────────────────────────
export class SvgRecorder {
  constructor() {
    this.m = IDENT.slice();
    this.stack = [];
    this.seg = [];              // current path, already in user space
    this.start = null;          // subpath start, for closePath
    this.cur = null;            // current point, in LOCAL coords
    this.out = [];              // emitted elements
    this.defs = [];
    this.clipStack = [];        // open <g clip-path> depth per save()
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.imageSmoothingEnabled = true;
    this.imageSmoothingQuality = 'high';
    this.globalAlpha = 1;
  }

  // -- state ----------------------------------------------------------------
  save() {
    this.stack.push({
      m: this.m.slice(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      globalAlpha: this.globalAlpha,
      clips: 0,
    });
  }

  restore() {
    const s = this.stack.pop();
    if (!s) return;
    for (let i = 0; i < s.clips; i++) this.out.push('</g>');
    this.m = s.m;
    this.fillStyle = s.fillStyle;
    this.strokeStyle = s.strokeStyle;
    this.lineWidth = s.lineWidth;
    this.lineCap = s.lineCap;
    this.lineJoin = s.lineJoin;
    this.globalAlpha = s.globalAlpha;
  }

  translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); }
  scale(x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); }
  rotate(a) { this.m = mul(this.m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }

  // -- path -----------------------------------------------------------------
  beginPath() { this.seg = []; this.cur = null; this.start = null; }

  moveTo(x, y) {
    const [px, py] = apply(this.m, x, y);
    this.seg.push(`M${round(px)} ${round(py)}`);
    this.cur = [x, y];
    this.start = [x, y];
  }

  lineTo(x, y) {
    if (!this.cur) return this.moveTo(x, y);
    const [px, py] = apply(this.m, x, y);
    this.seg.push(`L${round(px)} ${round(py)}`);
    this.cur = [x, y];
  }

  bezierCurveTo(x1, y1, x2, y2, x, y) {
    if (!this.cur) this.moveTo(x1, y1);
    const [ax, ay] = apply(this.m, x1, y1);
    const [bx, by] = apply(this.m, x2, y2);
    const [cx, cy] = apply(this.m, x, y);
    this.seg.push(`C${round(ax)} ${round(ay)} ${round(bx)} ${round(by)} ${round(cx)} ${round(cy)}`);
    this.cur = [x, y];
  }

  quadraticCurveTo(x1, y1, x, y) {
    if (!this.cur) this.moveTo(x1, y1);
    const [ax, ay] = apply(this.m, x1, y1);
    const [cx, cy] = apply(this.m, x, y);
    this.seg.push(`Q${round(ax)} ${round(ay)} ${round(cx)} ${round(cy)}`);
    this.cur = [x, y];
  }

  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  closePath() {
    if (!this.seg.length) return;
    this.seg.push('Z');
    if (this.start) this.cur = this.start.slice();
  }

  // Arcs and ellipses become cubics in LOCAL space and are then transformed
  // like any other control point. Going through cubics rather than SVG's own
  // A command is what makes this correct under a transform: an SVG arc's radii
  // are axis-aligned, so a rotated or unevenly scaled one would need its own
  // solve, and a cubic just needs its four points moved.
  ellipse(cx, cy, rx, ry, rot, a0, a1, ccw = false) {
    let sweep = a1 - a0;
    if (ccw) { if (sweep > 0) sweep -= TAU; if (sweep < -TAU) sweep = -TAU; }
    else { if (sweep < 0) sweep += TAU; if (sweep > TAU) sweep = TAU; }
    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
    const d = sweep / steps;
    const k = (4 / 3) * Math.tan(d / 4);
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const at = (ang) => {
      const x = rx * Math.cos(ang), y = ry * Math.sin(ang);
      return [cx + x * cos - y * sin, cy + x * sin + y * cos];
    };
    const deriv = (ang) => {
      const x = -rx * Math.sin(ang), y = ry * Math.cos(ang);
      return [x * cos - y * sin, x * sin + y * cos];
    };
    let ang = a0;
    const [sx, sy] = at(ang);
    if (!this.cur) this.moveTo(sx, sy); else this.lineTo(sx, sy);
    for (let i = 0; i < steps; i++) {
      const next = ang + d;
      const [p0x, p0y] = at(ang);
      const [d0x, d0y] = deriv(ang);
      const [p1x, p1y] = at(next);
      const [d1x, d1y] = deriv(next);
      this.bezierCurveTo(
        p0x + d0x * k, p0y + d0y * k,
        p1x - d1x * k, p1y - d1y * k,
        p1x, p1y,
      );
      ang = next;
    }
  }

  arc(cx, cy, r, a0, a1, ccw = false) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }

  // The corner-rounding form. Same solve the spec describes: find the tangent
  // points on the two legs, line to the first, arc to the second.
  arcTo(x1, y1, x2, y2, r) {
    if (!this.cur) return this.moveTo(x1, y1);
    const [x0, y0] = this.cur;
    const a = [x0 - x1, y0 - y1];
    const b = [x2 - x1, y2 - y1];
    const la = Math.hypot(a[0], a[1]);
    const lb = Math.hypot(b[0], b[1]);
    if (!la || !lb || !r) return this.lineTo(x1, y1);
    const ua = [a[0] / la, a[1] / la];
    const ub = [b[0] / lb, b[1] / lb];
    const cosT = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1]));
    const theta = Math.acos(cosT);
    if (theta < 1e-6 || Math.abs(Math.PI - theta) < 1e-6) return this.lineTo(x1, y1);
    // NO CLAMPING. The tangent points are solved on the infinite RAYS out of the
    // corner, which is what canvas does — a radius larger than the adjacent
    // segment simply puts a tangent point beyond the previous vertex, and the
    // path backs up to meet it. Refusing that case and drawing a straight line
    // instead is what squared off Gary's shoulder: his torso's corner radius is
    // wider than the short run of edge leading into it.
    const dist = r / Math.tan(theta / 2);
    const t1 = [x1 + ua[0] * dist, y1 + ua[1] * dist];
    const t2 = [x1 + ub[0] * dist, y1 + ub[1] * dist];
    // centre sits along the angle bisector
    const bis = [ua[0] + ub[0], ua[1] + ub[1]];
    const lbis = Math.hypot(bis[0], bis[1]) || 1;
    const hyp = r / Math.sin(theta / 2);
    const c = [x1 + (bis[0] / lbis) * hyp, y1 + (bis[1] / lbis) * hyp];
    const a0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    const a1 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    const cross = ua[0] * ub[1] - ua[1] * ub[0];
    this.lineTo(t1[0], t1[1]);
    this.ellipse(c[0], c[1], r, r, 0, a0, a1, cross > 0);
  }

  // -- paint ----------------------------------------------------------------
  #alpha(attr) { return this.globalAlpha < 1 ? ` ${attr}="${round(this.globalAlpha)}"` : ''; }

  fill(rule) {
    const d = this.seg.join('');
    if (!d) return;
    if (this.fillStyle instanceof Gradient) this.#useGrad(this.fillStyle);
    const fr = rule === 'evenodd' ? ' fill-rule="evenodd"' : '';
    this.out.push(`<path d="${d}" fill="${paintRef(this.fillStyle)}"${fr}${this.#alpha('fill-opacity')}/>`);
  }

  stroke() {
    const d = this.seg.join('');
    if (!d) return;
    if (this.strokeStyle instanceof Gradient) this.#useGrad(this.strokeStyle);
    const w = this.lineWidth * scaleOf(this.m);
    const cap = this.lineCap !== 'butt' ? ` stroke-linecap="${this.lineCap}"` : '';
    const join = this.lineJoin !== 'miter' ? ` stroke-linejoin="${this.lineJoin}"` : '';
    this.out.push(`<path d="${d}" fill="none" stroke="${paintRef(this.strokeStyle)}"`
      + ` stroke-width="${round(w)}"${cap}${join}${this.#alpha('stroke-opacity')}/>`);
  }

  // A clip stays in force until the matching restore(), which is exactly what a
  // <g clip-path> wrapper does — so open one and let restore() close it.
  clip() {
    const d = this.seg.join('');
    if (!d) return;
    const id = `c${gradSeq++}`;
    this.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    this.out.push(`<g clip-path="url(#${id})">`);
    if (this.stack.length) this.stack[this.stack.length - 1].clips++;
  }

  #useGrad(g) {
    if (!this.defs.includes(g.__def)) {
      g.__def = g.toDef();
      this.defs.push(g.__def);
    }
  }

  createLinearGradient(x0, y0, x1, y1) {
    return new Gradient('linear', [x0, y0, x1, y1], this.m.slice());
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return new Gradient('radial', [x0, y0, r0, x1, y1, r1], this.m.slice());
  }

  // -- result ---------------------------------------------------------------
  // Close anything the painter left open, so an unbalanced save() cannot emit
  // malformed SVG.
  markup() {
    let body = this.out.join('');
    for (const s of this.stack) for (let i = 0; i < s.clips; i++) body += '</g>';
    return { defs: this.defs.join(''), body };
  }
}

// Anything the painters do not use is a hole waiting to happen, so make the
// hole loud: an unsupported call throws at build time rather than drawing
// nothing at run time.
const UNSUPPORTED = [
  'drawImage', 'putImageData', 'getImageData', 'createPattern', 'fillText',
  'strokeText', 'measureText', 'createConicGradient', 'setLineDash', 'filter',
];
for (const name of UNSUPPORTED) {
  SvgRecorder.prototype[name] = function unsupported() {
    throw new Error(`canvas-to-svg: ${name} is not supported — the toon painters did not use it when this was written`);
  };
}
