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
uniform float uFx, uGlow;
uniform vec2 uShake;
void main() {
  vec2 d = vUv - 0.5;
  float r = length(d);
  vec2 ab = d * 0.0022 * r * uFx;
  // aberration + bloom soften only the BACKGROUND; the full-resolution
  // overlay (heroes, banners) composites on top pin-sharp.
  vec2 buv = clamp(vUv - uShake, 0.0, 1.0);
  vec3 bg;
  bg.r = texture2D(uBack, buv + ab).r;
  bg.g = texture2D(uBack, buv).g;
  bg.b = texture2D(uBack, buv - ab).b;
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
      g.uniform2f(g.getUniformLocation(p, 'uShake'), shakeX / this.srcW, -shakeY / this.srcH);
    });
  },
};
