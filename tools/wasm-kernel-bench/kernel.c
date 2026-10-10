/*
 * Stage 1 of docs/WASM-audio-engine-plan.md: MRDR-3's hot path in C, for a cost bench.
 *
 * Not the synth. One layer per voice group — a unison stack reading the band-limited mip
 * pyramid with its level crossfade, per-group vibrato, a 2-stage layer filter and a 2-stage
 * global filter that both rebuild their coefficients every sample under an envelope, an
 * amp envelope and a VCA. That is the inner loop of Mrdr3Core.process with everything that
 * is a branch around it taken out, and it is where the time goes.
 *
 * kernel-js.js is the same loop in JS, built on the PRODUCTION primitives (Mrdr3Biquad,
 * mrdr3Read, mrdr3Level from src/engine/mrdr3/). Every formula here is a line-for-line
 * port of those, in the same order, in doubles — so the two outputs agree to the last
 * bit or two (libm's cos/sin/pow are not V8's), and the bench checks they do before it
 * quotes a time.
 *
 * Setup values (frequencies, levels, phases, coefficients) are computed ONCE in JS and
 * handed to both kernels, so only the per-sample work is being compared.
 */
#include <math.h>

#define EXPORT __attribute__((visibility("default")))
#define BLOCK 128
#define SIZE 2048
#define LEVELS 12
#define STRIDE (SIZE + 1)
#define MAXG 16
#define MAXU 4
#define TAU 6.283185307179586
#define PI 3.141592653589793

static float table[LEVELS * STRIDE];
static float outL[BLOCK], outR[BLOCK];

typedef struct {
  double rate, lastFreq, lastQ, lastQdb, qLinear;
  double b0, b1, b2, a1, a2;
  double x1L, x2L, y1L, y2L, x1R, x2R, y1R, y2R;
} Biquad;

typedef struct {
  double phase, hzNow, levelNow, gain, panL, panR;
} Voice;

typedef struct {
  Voice v[MAXU];
  double vibPhase[MAXU], vibRate[MAXU], vibRatio[MAXU], vibLevel[MAXU], vibDepth;
  Biquad lf[2], gf[2];
  double lEnv, lEnvCoef, lFreq, lQ, lOct, lastLfq;
  double gEnv, gEnvCoef, gFreq, gQ, gOct, lastGfq;
  double amp, ampCoef, ampSus, vca, vcaCoef, vcaSus, gain;
} Group;

static Group groups[MAXG];
static int nGroups, nUnison;
static double rate;

EXPORT float *tablePtr(void) { return table; }
EXPORT float *outLPtr(void) { return outL; }
EXPORT float *outRPtr(void) { return outR; }

static void biquadInit(Biquad *b, double r) {
  b->rate = r;
  b->lastFreq = NAN; b->lastQ = NAN; b->lastQdb = NAN; b->qLinear = 0;
  b->b0 = 1; b->b1 = 0; b->b2 = 0; b->a1 = 0; b->a2 = 0;
  b->x1L = b->x2L = b->y1L = b->y2L = 0;
  b->x1R = b->x2R = b->y1R = b->y2R = 0;
}

/* Mrdr3Biquad.prototype.setCoeffs, lowpass only — the kernel's two filters are lowpass. */
static void setCoeffs(Biquad *b, double freq, double Q) {
  if (freq == b->lastFreq && Q == b->lastQ) return;
  b->lastFreq = freq;
  b->lastQ = Q;
  double nyquist = b->rate * 0.5;
  double f0 = freq / nyquist;
  if (f0 < 0) f0 = 0; else if (f0 > 1) f0 = 1;
  if (f0 <= 0 || f0 >= 1) {
    b->b0 = f0 >= 1 ? 1 : 0; b->b1 = 0; b->b2 = 0; b->a1 = 0; b->a2 = 0;
    return;
  }
  double w0 = PI * f0;
  double cw = cos(w0);
  double sw = sin(w0);
  if (Q != b->lastQdb) { b->lastQdb = Q; b->qLinear = pow(10, Q / 20); }
  double alpha = sw / (2 * b->qLinear);
  double a0 = 1 + alpha;
  double a1 = -2 * cw;
  double a2 = 1 - alpha;
  double b0 = (1 - cw) * 0.5, b1 = 1 - cw, b2 = b0;
  double inv = 1 / a0;
  b->b0 = b0 * inv; b->b1 = b1 * inv; b->b2 = b2 * inv;
  b->a1 = a1 * inv; b->a2 = a2 * inv;
}

static inline double stepL(Biquad *b, double x) {
  double y = b->b0 * x + b->b1 * b->x1L + b->b2 * b->x2L - b->a1 * b->y1L - b->a2 * b->y2L;
  b->x2L = b->x1L; b->x1L = x;
  b->y2L = b->y1L; b->y1L = y;
  return y;
}

static inline double stepR(Biquad *b, double x) {
  double y = b->b0 * x + b->b1 * b->x1R + b->b2 * b->x2R - b->a1 * b->y1R - b->a2 * b->y2R;
  b->x2R = b->x1R; b->x1R = x;
  b->y2R = b->y1R; b->y1R = y;
  return y;
}

/* mrdr3Read: two neighbours in each of the two bracketing levels, three lerps. */
static inline double mipRead(double level, double phase) {
  int lo = (int)level;
  double lf = level - lo;
  double x = phase * SIZE;
  int i = (int)x;
  double f = x - i;
  int a = lo * STRIDE + i;
  double va = table[a] + ((double)table[a + 1] - table[a]) * f;
  if (lf <= 0) return va;
  int b = (lo + 1) * STRIDE + i;
  double vb = table[b] + ((double)table[b + 1] - table[b]) * f;
  return va + (vb - va) * lf;
}

EXPORT void setup(int groupCount, int unison, double sampleRate) {
  nGroups = groupCount > MAXG ? MAXG : groupCount;
  nUnison = unison > MAXU ? MAXU : unison;
  rate = sampleRate;
  for (int g = 0; g < nGroups; g++) {
    for (int k = 0; k < 2; k++) { biquadInit(&groups[g].lf[k], rate); biquadInit(&groups[g].gf[k], rate); }
    groups[g].lastLfq = NAN;
    groups[g].lastGfq = NAN;
  }
}

EXPORT void setGroup(int g, double vibDepth, double lFreq, double lQ, double lOct, double lEnvCoef,
                     double gFreq, double gQ, double gOct, double gEnvCoef,
                     double ampCoef, double ampSus, double vcaCoef, double vcaSus, double gain) {
  Group *p = &groups[g];
  p->vibDepth = vibDepth;
  p->lFreq = lFreq; p->lQ = lQ; p->lOct = lOct; p->lEnv = 1; p->lEnvCoef = lEnvCoef;
  p->gFreq = gFreq; p->gQ = gQ; p->gOct = gOct; p->gEnv = 1; p->gEnvCoef = gEnvCoef;
  p->amp = 0; p->ampCoef = ampCoef; p->ampSus = ampSus;
  p->vca = 0; p->vcaCoef = vcaCoef; p->vcaSus = vcaSus;
  p->gain = gain;
}

EXPORT void setVoice(int g, int u, double hzNow, double levelNow, double phase, double gain,
                     double panL, double panR, double vibRate, double vibPhase) {
  Voice *v = &groups[g].v[u];
  v->hzNow = hzNow; v->levelNow = levelNow; v->phase = phase;
  v->gain = gain; v->panL = panL; v->panR = panR;
  groups[g].vibRate[u] = vibRate;
  groups[g].vibPhase[u] = vibPhase;
}

EXPORT void render(int frames) {
  if (frames > BLOCK) frames = BLOCK;
  double nyquist = rate * 0.5;
  double topLevel = LEVELS - 1;
  for (int n = 0; n < frames; n++) {
    double mixL = 0, mixR = 0;
    for (int g = 0; g < nGroups; g++) {
      Group *grp = &groups[g];
      for (int i = 0; i < nUnison; i++) {
        grp->vibPhase[i] += grp->vibRate[i] / rate;
        if (grp->vibPhase[i] >= 1) grp->vibPhase[i] -= 1;
        double c = sin(TAU * grp->vibPhase[i]) * grp->vibDepth;
        grp->vibRatio[i] = pow(2, c / 1200);
        grp->vibLevel[i] = c / 1200;
      }
      double layL = 0, layR = 0;
      for (int u = 0; u < nUnison; u++) {
        Voice *uv = &grp->v[u];
        double hz = uv->hzNow * grp->vibRatio[u];
        if (hz > nyquist) hz = nyquist; else if (hz < -nyquist) hz = -nyquist;
        double inc = hz / rate;
        double level = uv->levelNow + grp->vibLevel[u];
        if (level < 0) level = 0; else if (level > topLevel) level = topLevel;
        double v = mipRead(level, uv->phase) * uv->gain;
        uv->phase += inc;
        if (uv->phase >= 1) uv->phase -= 1; else if (uv->phase < 0) uv->phase += 1;
        layL += v * uv->panL;
        layR += v * uv->panR;
      }
      grp->lEnv *= grp->lEnvCoef;
      double lcents = grp->lOct * 1200 * grp->lEnv;
      double lfq = grp->lFreq * pow(2, lcents / 1200);
      if (lfq != grp->lastLfq) {
        grp->lastLfq = lfq;
        setCoeffs(&grp->lf[0], lfq, grp->lQ);
        setCoeffs(&grp->lf[1], lfq, 0.7071);
      }
      for (int s = 0; s < 2; s++) {
        layL = stepL(&grp->lf[s], layL);
        layR = stepR(&grp->lf[s], layR);
      }
      grp->amp = grp->amp * grp->ampCoef + grp->ampSus * (1 - grp->ampCoef);
      double toneL = layL * grp->amp;
      double toneR = layR * grp->amp;

      grp->gEnv *= grp->gEnvCoef;
      double gcents = grp->gOct * 1200 * grp->gEnv;
      double gfq = grp->gFreq * pow(2, gcents / 1200);
      if (gfq != grp->lastGfq) {
        grp->lastGfq = gfq;
        setCoeffs(&grp->gf[0], gfq, grp->gQ);
        setCoeffs(&grp->gf[1], gfq, 0.7071);
      }
      for (int s = 0; s < 2; s++) {
        toneL = stepL(&grp->gf[s], toneL);
        toneR = stepR(&grp->gf[s], toneR);
      }
      grp->vca = grp->vca * grp->vcaCoef + grp->vcaSus * (1 - grp->vcaCoef);
      toneL *= grp->vca;
      toneR *= grp->vca;
      mixL += toneL * grp->gain;
      mixR += toneR * grp->gain;
    }
    outL[n] = (float)mixL;
    outR[n] = (float)mixR;
  }
}
