/*
 * Stage 0 of docs/WASM-audio-engine-plan.md: the smallest thing that proves the plumbing.
 *
 * A sine by rotating a phasor, so there is no libm to link and the arithmetic is two
 * complex multiplies per sample. IEEE doubles in wasm are deterministic, so the same
 * recurrence written in JS must produce the SAME BITS — tests/wasm-worklet-proof.js holds
 * it to exact equality, which is a stronger claim than "close to Math.sin" and is the one
 * the real port will lean on.
 *
 * Freestanding: no libc, no allocator. The output block is a static array the host reads
 * through `memory.buffer` at the address `block()` returns.
 */
#define EXPORT __attribute__((visibility("default")))
#define BLOCK 128

static float out[BLOCK];
static double re, im, cr, ci;

EXPORT float *block(void) { return out; }

/* The rotation per sample (cos w, sin w) and the starting phase as a unit vector. */
EXPORT void start(double cos_w, double sin_w, double phase_re, double phase_im) {
  cr = cos_w; ci = sin_w; re = phase_re; im = phase_im;
}

EXPORT void render(int frames) {
  if (frames > BLOCK) frames = BLOCK;
  double r = re, i = im;
  for (int n = 0; n < frames; n++) {
    out[n] = (float)i;
    double nr = r * cr - i * ci;
    i = r * ci + i * cr;
    r = nr;
  }
  re = r; im = i;
}
