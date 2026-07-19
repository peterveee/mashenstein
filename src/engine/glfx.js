// WebGL post-processing: the 2D-rendered frame (backbuffer + hero overlay)
// is composited and enhanced on the GPU — bloom on bright pixels, a soft
// vignette, and a whisper of chromatic aberration toward the screen edges.
// Pure enhancement layer: if WebGL is unavailable, the renderer's plain 2D
// path runs exactly as before. The GLOW FX setting drives uFx (0..1).

const VS = `
attribute vec2 aP;
varying vec2 vUv;
void main() { vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;

const FS_BRIGHT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uT;
void main() {
  vec3 c = texture2D(uT, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(c * smoothstep(0.8, 0.97, l), 1.0);
}`;

const FS_BLUR = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uT;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uT, vUv).rgb * 0.227;
  c += (texture2D(uT, vUv + uDir * 1.385).rgb + texture2D(uT, vUv - uDir * 1.385).rgb) * 0.316;
  c += (texture2D(uT, vUv + uDir * 3.231).rgb + texture2D(uT, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;

const FS_FINAL = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uBack, uBloom, uOv;
uniform float uFx, uGlow, uSky, uTime;
uniform vec2 uShake;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return s;
}

// One grid of stars: each cell may hold a star with its own color, phase and
// twinkle rate. Core + halo + a faint diffraction cross, so bright ones read
// as points of light rather than dots.
vec3 starGrid(vec2 uv, float scale, float seed, float t) {
  vec2 g = uv * scale + seed * 13.7;
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = hash21(id + seed);
  float present = step(0.74, h);
  vec2 off = (vec2(hash21(id + 3.13), hash21(id + 7.77)) - 0.5) * 0.66;
  vec2 dv = f - off;
  float d = length(dv);
  float tw = 0.30 + 0.70 * pow(0.5 + 0.5 * sin(t * (1.1 + 4.0 * fract(h * 17.0)) + h * 44.0), 2.0);
  float core = smoothstep(0.055, 0.004, d);
  float halo = smoothstep(0.34, 0.0, d);
  halo = halo * halo * halo;
  float mag = fract(h * 91.0);
  float spike = smoothstep(0.26, 0.0, abs(dv.x) * 9.0 + d * 1.4)
              + smoothstep(0.26, 0.0, abs(dv.y) * 9.0 + d * 1.4);
  vec3 tint = mix(vec3(0.70, 0.80, 1.0), vec3(1.0, 0.85, 0.60), mag);
  return present * tw * (core + halo * 0.34 + spike * 0.16 * step(0.72, mag)) * tint;
}

// The whole deep-space backdrop, generated on the GPU wherever the 2D layer
// left a hole: gradient, drifting nebula, three parallax star grids, and a
// shooting star that crosses every few seconds.
vec3 skyColor(vec2 uv, float t) {
  float sy = 1.0 - uv.y;                       // 0 at the top of the screen
  vec3 col = mix(vec3(0.027, 0.027, 0.059), vec3(0.078, 0.062, 0.149), smoothstep(0.0, 0.65, sy));
  col = mix(col, vec3(0.110, 0.078, 0.188), smoothstep(0.65, 1.0, sy));

  vec2 p = vec2(uv.x * 1.778, uv.y);           // square up the aspect
  float depth = smoothstep(0.85, 0.05, sy);    // everything fades toward the floor

  // nebula: two counter-drifting noise fields, tinted teal and violet
  float n1 = fbm(p * 3.1 + vec2(t * 0.012, t * 0.005));
  float n2 = fbm(p * 5.3 - vec2(t * 0.008, 0.0) + 21.0);
  float neb = smoothstep(0.45, 0.95, n1 * 0.65 + n2 * 0.45);
  col += neb * depth * mix(vec3(0.05, 0.16, 0.20), vec3(0.16, 0.05, 0.22), n2) * 0.85;

  // three parallax layers: far and faint, near and bright
  vec3 s = starGrid(p, 34.0, 0.0, t) * 0.40
         + starGrid(p + vec2(t * 0.004, 0.0), 22.0, 1.0, t) * 0.75
         + starGrid(p + vec2(t * 0.009, 0.0), 13.0, 2.0, t) * 1.15;
  col += s * depth;

  // shooting star: one streak per 6.5s window, only in the upper sky
  float cyc = floor(t / 6.5);
  float ph = fract(t / 6.5) * 6.5;
  float sh = hash21(vec2(cyc, 3.0));
  vec2 a = vec2(-0.15 + sh * 0.5, 0.12 + hash21(vec2(cyc, 9.0)) * 0.22);
  vec2 dir = normalize(vec2(1.0, 0.42));
  float travel = (ph - 0.4) * 1.5;
  vec2 head = a + dir * travel;
  vec2 rel = p - head;
  float along = dot(rel, -dir);
  float across = abs(dot(rel, vec2(-dir.y, dir.x)));
  float trail = smoothstep(0.22, 0.0, along) * step(0.0, along) * smoothstep(0.010, 0.0, across);
  trail += smoothstep(0.03, 0.0, length(rel)) * 1.6;
  float alive = step(0.0, travel) * step(travel, 1.6) * step(0.55, sh);
  col += trail * alive * depth * vec3(0.85, 0.92, 1.0);

  return col;
}

void main() {
  vec2 d = vUv - 0.5;
  float r = length(d);
  vec2 ab = d * 0.0022 * r * uFx;
  // aberration + bloom soften only the BACKGROUND; the full-resolution
  // overlay (heroes, banners) composites on top pin-sharp.
  vec2 buv = clamp(vUv - uShake, 0.0, 1.0);
  vec4 bsrc = texture2D(uBack, buv);
  vec3 bg;
  bg.r = texture2D(uBack, buv + ab).r;
  bg.g = bsrc.g;
  bg.b = texture2D(uBack, buv - ab).b;
  // Wherever the 2D layer left a hole (the title screen's sky), the GPU fills
  // it in procedurally. Backbuffer colors are premultiplied, so this slots in
  // underneath without any extra blending math.
  if (uSky > 0.5) bg += skyColor(vUv, uTime) * (1.0 - bsrc.a);
  vec3 bl = texture2D(uBloom, vUv).rgb;
  vec4 ov = texture2D(uOv, vUv);
  vec3 col = ov.rgb + (bg + bl * 0.45 * uFx * uGlow) * (1.0 - ov.a);
  float vig = 1.0 - smoothstep(0.55, 0.98, r) * (0.1 + 0.14 * uFx);
  gl_FragColor = vec4(col * vig, 1.0);
}`;

function compile(gl, vsSrc, fsSrc) {
  const mk = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

function makeTex(gl, w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return t;
}
function makeFbo(gl, w, h) {
  const tex = makeTex(gl, w, h);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, tex, w, h };
}

export const glfx = {
  gl: null,
  active: false,
  fx: 1,    // GLOW FX setting: 1 on, 0 off
  glow: 0,  // scene bloom gate: 1 only during live gameplay, 0 on menus/pause
  sky: 0,   // procedural starfield gate: 1 on the title screen only
  time: 0,  // sky animation clock (seconds); frozen when flashing is reduced

  init(canvas) {
    let gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: false }) || canvas.getContext('webgl', { alpha: false }); } catch (e) { gl = null; }
    if (!gl) return false;
    try {
      this.gl = gl;
      this.pBright = compile(gl, VS, FS_BRIGHT);
      this.pBlur = compile(gl, VS, FS_BLUR);
      this.pFinal = compile(gl, VS, FS_FINAL);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.texBack = makeTex(gl);
      this.texOv = makeTex(gl);
      this.active = true;
      return true;
    } catch (e) {
      this.gl = null;
      this.active = false;
      return false;
    }
  },

  resize(srcW, srcH) {
    const gl = this.gl;
    if (!gl) return;
    this.srcW = srcW; this.srcH = srcH;
    this.ready = true;
    const bw = Math.max(1, srcW >> 2), bh = Math.max(1, srcH >> 2);
    this.bloomA = makeFbo(gl, bw, bh);
    this.bloomB = makeFbo(gl, bw, bh);
  },

  draw(prog, setUniforms) {
    const gl = this.gl;
    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, 'aP');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    setUniforms(gl, prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },

  upload(tex, canvas) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // KEEP canvas data premultiplied: the compositing formula assumes it.
    // Without this, every anti-aliased edge (text, hero outlines) gets its
    // color un-premultiplied to full strength and composites as a bright
    // fringe — "glowing outlines" on all overlay art.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  },

  render(backCanvas, overlayCanvas, shakeX, shakeY, outW, outH) {
    const gl = this.gl;
    if (!gl || !this.ready) return;
    this.upload(this.texBack, backCanvas);
    this.upload(this.texOv, overlayCanvas);
    const bind = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };

    // 1) bright-pass the WORLD ONLY into quarter-res, then two blur passes.
    //    The overlay (heroes, HUD, popup text) is deliberately excluded:
    //    world glows, UI reads.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fb);
    gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
    this.draw(this.pBright, (g, p) => {
      bind(0, this.texBack);
      g.uniform1i(g.getUniformLocation(p, 'uT'), 0);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fb);
    this.draw(this.pBlur, (g, p) => {
      bind(0, this.bloomA.tex);
      g.uniform1i(g.getUniformLocation(p, 'uT'), 0);
      g.uniform2f(g.getUniformLocation(p, 'uDir'), 1 / this.bloomA.w, 0);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fb);
    this.draw(this.pBlur, (g, p) => {
      bind(0, this.bloomB.tex);
      g.uniform1i(g.getUniformLocation(p, 'uT'), 0);
      g.uniform2f(g.getUniformLocation(p, 'uDir'), 0, 1 / this.bloomB.h);
    });

    // 2) final: world + bloom + vignette + aberration, crisp overlay on top
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, outW, outH);
    this.draw(this.pFinal, (g, p) => {
      bind(0, this.texBack); bind(1, this.bloomA.tex); bind(2, this.texOv);
      g.uniform1i(g.getUniformLocation(p, 'uBack'), 0);
      g.uniform1i(g.getUniformLocation(p, 'uBloom'), 1);
      g.uniform1i(g.getUniformLocation(p, 'uOv'), 2);
      g.uniform1f(g.getUniformLocation(p, 'uFx'), this.fx);
      g.uniform1f(g.getUniformLocation(p, 'uGlow'), this.glow);
      g.uniform1f(g.getUniformLocation(p, 'uSky'), this.sky);
      g.uniform1f(g.getUniformLocation(p, 'uTime'), this.time);
      g.uniform2f(g.getUniformLocation(p, 'uShake'), shakeX / this.srcW, -shakeY / this.srcH);
    });
  },
};
