// SPACE CABINET — ten more planets (lab only). Peter, 14 Oct 2026: "id like a
// lot more planets to put into the mix so we don't get as much repetition give
// me 10 new planets. I would like one to be the famous image of pluto with the
// love heart … go wild with the planets. they don't need to be real, can be
// from science fiction." Same flat-facet sphere as the parade (lit from the
// upper left, no gradients on the body), but each facet is painted from the
// body's own latitude/longitude, so continents, storms, cracks and the heart
// stay fixed to the surface as it turns.

const TAU = Math.PI * 2;
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
const L3 = (() => { const v = [-0.55, -0.5, 0.67], l = Math.hypot(...v); return v.map(x => x / l); })();
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function glow(c, x, y, r, rgba) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)'));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
// Lit level 0..1 → a step of the ramp, as the parade's shade() does.
const step = (ramp, lit) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor((lit + 0.25) / 1.25 * ramp.length)))];
// Signed angle between two longitudes.
const dLon = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// The faceted sphere. `paint(lat, lon, lit, i, j, n)` returns the facet's ink;
// lat is negative toward the top of the screen (before tilt), lon is the body's
// own longitude (it turns with `spin`), lit is the facet's light, -1..1.
// Returns the visible facets' centres and lights for anything drawn on top.
function sphere(c, cx, cy, R, spin, { nLat = 8, nLon = 16, tilt = 0.3, roll = -0.25, paint }) {
  const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
  const tf = ([x, y, z]) => { const y1 = y * ct - z * st, z1 = y * st + z * ct; return [x * cr - y1 * sr, x * sr + y1 * cr, z1]; };
  const sph = (lat, lon) => tf([Math.cos(lat) * Math.sin(lon + spin), Math.sin(lat), Math.cos(lat) * Math.cos(lon + spin)]);
  const out = [];
  for (let i = 0; i < nLat; i++) {
    const la0 = -Math.PI / 2 + i * Math.PI / nLat, la1 = la0 + Math.PI / nLat, la = (la0 + la1) / 2;
    for (let j = 0; j < nLon; j++) {
      const lo0 = j * TAU / nLon, lo1 = lo0 + TAU / nLon, lo = (lo0 + lo1) / 2;
      const n = sph(la, lo);
      if (n[2] <= 0.01) continue;
      const lit = n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2];
      const pts = [sph(la0, lo0), sph(la0, lo1), sph(la1, lo1), sph(la1, lo0)].map(q => [cx + q[0] * R, cy + q[1] * R]);
      poly(c, pts, paint(la, lo, lit, i, j, n));
      out.push({ x: cx + n[0] * R, y: cy + n[1] * R, lit, la, lo, i, j, n });
    }
  }
  return out;
}
// Flat faceted rings (back half or front half), like the parade's.
function rings(c, cx, cy, R, front, { tilt = 0.3, roll = -0.25, bands = [[1.4, 1.62], [1.68, 1.95]], ramp, n = 36 }) {
  const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
  const tf = ([x, y, z]) => { const y1 = y * ct - z * st, z1 = y * st + z * ct; return [x * cr - y1 * sr, x * sr + y1 * cr, z1]; };
  bands.forEach(([r0, r1], b) => {
    for (let k = 0; k < n; k++) {
      const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, am = (a0 + a1) / 2;
      if ((tf([Math.cos(am), 0, Math.sin(am)])[2] > 0) !== front) continue;
      const p = [[r0, a0], [r1, a0], [r1, a1], [r0, a1]].map(([r, a]) => tf([Math.cos(a) * r, 0, Math.sin(a) * r]));
      poly(c, p.map(q => [cx + q[0] * R, cy + q[1] * R]), ramp[(k + b) % 2 + (front ? 2 : 0)]);
    }
  });
}
// Smooth-ish value noise on the sphere from a few sines — enough for continents.
const swirl = (la, lo, seed) => Math.sin(lo * 2 + seed) * 0.5 + Math.sin(lo * 3 - la * 2.4 + seed * 1.7) * 0.35
  + Math.sin(la * 4.2 + lo + seed * 0.6) * 0.3 + Math.sin(lo * 5 + la * 3 + seed * 2.3) * 0.15;

// ------------------------------------------------------------------ the ten
// Each: { id, name, note, R, draw(c, x, y, R, t) }. R is the radius in the
// vista's units, chosen against the parade (13–24).
export const PLANET_CANDIDATES = [
  {
    id: 'pluto', name: 'PLUTO, WITH ITS HEART', R: 16,
    note: 'New Horizons’ Pluto: a tan world with the pale heart (Tombaugh Regio, its left lobe smoother and brighter) and the dark red-brown whale along the equator. Turns slowly so the heart comes round to face us.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.7, 'rgba(255,230,200,0.14)');
      const TAN = ['#3a2a22', '#6e5242', '#a07e64', '#c9aa88', '#e6d2b4'];
      const HEART = ['#6e665e', '#a8a096', '#d8d0c4', '#f2ede4', '#fffdf8'];
      const LOBE = ['#7a746c', '#b6b0a6', '#e4ded4', '#f8f5ee', '#ffffff'];
      const WHALE = ['#1e0e0c', '#3e1c16', '#5e2a1e', '#7c3a26', '#94482e'];
      const spin = Math.sin(t * 0.05) * 0.3 - 0.2;
      sphere(c, x, y, R, spin, { nLat: 17, nLon: 34, tilt: 0.18, roll: -0.1, paint: (la, lo, lit, i, j) => {
        // The heart: lobes up (toward −lat), point down, just south of the
        // equator and a third of the disc across, as in the New Horizons frame.
        const u = dLon(lo, 0.25) / 0.4, v = -(la - 0.12) / 0.4;
        const heart = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v < 0;
        if (heart) return step(u < 0 ? LOBE : HEART, lit);
        // The whale: a dark band just south of the equator, west of the heart.
        const w = dLon(lo, -0.75);
        if (la > 0.1 && la < 0.55 && Math.abs(w) < 0.62 - (la - 0.32) * (la - 0.32) * 6) return step(WHALE, lit);
        return step(TAN, lit - (hash(i * 31 + j * 7 + 3) < 0.12 ? 0.18 : 0));
      } });
    },
  },
  {
    id: 'storm', name: 'STORM GIANT', R: 26,
    note: 'A Jupiter-style banded giant in cream, rust and tan with one great red eye of a storm riding a southern band. The biggest body yet — it fills a window when it passes.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.6, 'rgba(255,190,130,0.16)');
      const B = [['#3a2016', '#7a4426', '#b8743e', '#e0a66a', '#f6d2a0'], ['#3c2a22', '#806454', '#bea088', '#e8d2b8', '#fff2e0'],
        ['#341a14', '#6e3220', '#a8502e', '#d27a48', '#eea66e']];
      const EYE = ['#3a0e0c', '#6e1a14', '#a82e20', '#d24a32', '#f07a56'];
      sphere(c, x, y, R, t * 0.04 - 1, { nLat: 14, nLon: 24, tilt: 0.22, roll: -0.12, paint: (la, lo, lit, i) => {
        const e = dLon(lo, 1.2) / 0.5, f = (la - 0.42) / 0.16;
        if (e * e + f * f < 1) return step(EYE, lit + (e * e + f * f < 0.3 ? 0.15 : 0));
        return step(B[[0, 1, 2, 1, 0, 1, 2, 2, 1, 0, 1, 2, 1, 0][i % 14]], lit);
      } });
    },
  },
  {
    id: 'magma', name: 'MAGMA WORLD', R: 15,
    note: 'Black basalt plates split by glowing lava seams that don’t care where the sun is — the cracks burn on the night side too — in a hot orange haze.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.9, `rgba(255,110,40,${0.22 + 0.05 * Math.sin(t * 1.3)})`);
      const ROCK = ['#0c0808', '#1c1414', '#2e2220', '#46342e', '#5e4840'];
      const LAVA = ['#ff5a1e', '#ff7a2a', '#ffa040', '#ffd070'];
      sphere(c, x, y, R, t * 0.08, { nLat: 15, nLon: 30, tilt: 0.35, paint: (la, lo, lit, i, j) => {
        const seam = Math.abs(Math.sin(lo * 3 + Math.sin(la * 3) * 1.4) * Math.cos(la * 2.5 + lo * 1.3));
        if (seam < 0.1) return LAVA[Math.floor(hash(i * 13 + j * 5 + Math.floor(t * 2)) * 2 + (seam < 0.07 ? 2 : 0))];
        return step(ROCK, lit);
      } });
    },
  },
  {
    id: 'ocean', name: 'BLUE MARBLE', R: 18,
    note: 'An Earth-like world: deep ocean, green and ochre continents, white polar caps and a few cloud facets drifting across faster than the ground turns.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.6, 'rgba(120,190,255,0.22)');
      const SEA = ['#06142e', '#0c2e5e', '#18548e', '#2e7cba', '#5aa6dc'];
      const LAND = ['#14240e', '#2c4a1a', '#4e7a2a', '#7ea444', '#b2c870'];
      const DRY = ['#2a1e10', '#5a4224', '#8e6c3c', '#bc9a5c', '#dcc48a'];
      const ICE = ['#7a8aa0', '#b4c2d4', '#dfe8f2', '#f4f8fc', '#ffffff'];
      sphere(c, x, y, R, t * 0.07, { nLat: 12, nLon: 24, tilt: 0.4, paint: (la, lo, lit) => {
        if (Math.abs(la) > 1.12) return step(ICE, lit);
        const cloud = swirl(la * 1.3, lo - t * 0.05, 9);
        if (cloud > 0.82) return step(ICE, lit - 0.08);
        const land = swirl(la, lo, 2);
        if (land > 0.35) return step(Math.abs(la) < 0.45 && land > 0.6 ? DRY : LAND, lit);
        return step(SEA, lit);
      } });
    },
  },
  {
    id: 'dune', name: 'DUNE WORLD', R: 17,
    note: 'A desert planet of sand seas in rippled bands, darker rock at the poles, and two little moons on their own orbits — one passes in front.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.6, 'rgba(255,210,140,0.16)');
      const SAND = [['#3a2410', '#7a5228', '#b4824a', '#dcb478', '#f4dcaa'], ['#34200e', '#6e4822', '#a87440', '#d2a46a', '#eccc98']];
      const ROCK = ['#24160e', '#4a3020', '#6e4a32', '#8e6648', '#a8805e'];
      const MOON = ['#2a2a30', '#55555e', '#86868e', '#b8b8c0'];
      const moon = (a, r, d, front) => {
        const mx = x + Math.cos(a) * d, my = y + Math.sin(a) * d * 0.28;
        if ((Math.sin(a) > 0) !== front) return;
        sphere(c, mx, my, r, a, { nLat: 5, nLon: 10, paint: (la, lo, lit) => step(MOON, lit) });
      };
      const a1 = t * 0.35, a2 = t * 0.22 + 2;
      moon(a1, 3.2, R * 1.75, false); moon(a2, 2.2, R * 2.3, false);
      sphere(c, x, y, R, t * 0.05, { nLat: 12, nLon: 22, tilt: 0.3, paint: (la, lo, lit, i, j) => {
        if (Math.abs(la) > 1.05) return step(ROCK, lit);
        const ripple = Math.sin(la * 9 + Math.sin(lo * 2) * 1.5);
        return step(SAND[ripple > 0 ? 0 : 1], lit + (ripple > 0.8 ? 0.1 : 0));
      } });
      moon(a1, 3.2, R * 1.75, true); moon(a2, 2.2, R * 2.3, true);
    },
  },
  {
    id: 'geode', name: 'CRYSTAL GEODE', R: 14,
    note: 'A world of huge crystal facets — amethyst and ice blue, few and big — that flash white as each face turns into the light.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 2, 'rgba(190,150,255,0.2)');
      const AME = ['#1c0e34', '#3e2070', '#6a40aa', '#9c76d8', '#cfb4f6'];
      const ICE = ['#0c2234', '#1c4a6a', '#3c84a8', '#78c0dc', '#c4ecf8'];
      const faces = sphere(c, x, y, R, t * 0.18, { nLat: 4, nLon: 7, tilt: 0.5, roll: 0.3, paint: (la, lo, lit, i, j) => {
        if (lit > 0.9) return '#ffffff';
        return step(hash(i * 7 + j * 3) < 0.55 ? AME : ICE, lit);
      } });
      for (const f of faces) if (f.lit > 0.86) glow(c, f.x, f.y, R * 0.5, `rgba(255,255,255,${(f.lit - 0.86) * 4})`);
    },
  },
  {
    id: 'sideways', name: 'SIDEWAYS RINGS', R: 17,
    note: 'A pale teal ice giant tipped on its side, so its gold rings stand almost upright — a Uranus that went for Saturn’s jewellery.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.6, 'rgba(140,240,230,0.18)');
      const ICE = [['#0c2a2c', '#1e5a5c', '#3a8e8c', '#72c2bc', '#b4eae2'], ['#0e2e30', '#22605e', '#40948e', '#7ac8c0', '#bcefe6']];
      const GOLD = ['#5a4420', '#8a6c34', '#d8b466', '#f4dc98'];
      const o = { tilt: 0.2, roll: 1.32 };
      rings(c, x, y, R, false, { ...o, ramp: GOLD, bands: [[1.35, 1.5], [1.56, 1.9]] });
      sphere(c, x, y, R, t * 0.05, { nLat: 10, nLon: 20, ...o, paint: (la, lo, lit, i) => step(ICE[i % 2], lit) });
      rings(c, x, y, R, true, { ...o, ramp: GOLD, bands: [[1.35, 1.5], [1.56, 1.9]] });
    },
  },
  {
    id: 'machine', name: 'MACHINE WORLD', R: 19,
    note: 'A planet built over: gunmetal plates, a glowing cyan trench round the equator, and city lights twinkling across the night side.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.5, 'rgba(120,230,255,0.14)');
      const STEEL = [['#0e1218', '#232a34', '#3e4856', '#64707e', '#96a2ae'], ['#10141a', '#283038', '#46505c', '#6e7a86', '#a2acb6']];
      const faces = sphere(c, x, y, R, t * 0.05, { nLat: 13, nLon: 26, tilt: 0.32, paint: (la, lo, lit, i, j) => {
        if (Math.abs(la) < 0.07) return `rgba(${120 + 60 * Math.sin(t * 3 + j)},235,255,1)`;
        return step(STEEL[(i + j) % 2], lit);
      } });
      for (const f of faces) {
        if (f.lit > 0.1 || Math.abs(f.la) < 0.1 || f.n[2] < 0.35) continue;
        for (let k = 0; k < 2; k++) {
          if (hash(f.i * 41 + f.j * 17 + k) > 0.6) continue;
          const on = 0.6 + 0.4 * Math.sin(t * 2 + f.i * 3 + f.j * 7 + k);
          c.fillStyle = `rgba(255,214,120,${on})`;
          c.fillRect(f.x + (hash(f.i + f.j * 9 + k) - 0.5) * 2.4, f.y + (hash(f.j + f.i * 5 + k) - 0.5) * 2.4, 0.7, 0.7);
        }
      }
      glow(c, x, y, R * 1.15, 'rgba(120,230,255,0.08)');
    },
  },
  {
    id: 'eyeball', name: 'EYEBALL WORLD', R: 16,
    note: 'The sci-fi tidally locked planet: one face forever baking under its sun (a scorched desert), a green ring of life along the twilight line, and the far side frozen white.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 1.6, 'rgba(255,220,160,0.16)');
      const HOT = ['#3a1a08', '#7a3a12', '#b8641e', '#e0963a', '#f8c46a'];
      const LIFE = ['#0e2410', '#1e4a1e', '#367a2c', '#5ea844', '#94d070'];
      const ICE = ['#4a5a6e', '#7e90a6', '#b4c4d6', '#dce6f0', '#f6faff'];
      const SEA = ['#06182a', '#0e3456', '#1c5a86', '#3484b4', '#5aaada'];
      sphere(c, x, y, R, 0, { nLat: 16, nLon: 32, tilt: 0.1, roll: 0, paint: (la, lo, lit, i, j, n) => {
        // Fixed to its sun (upper left): day side by the light, not the surface.
        const sun = n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2];
        if (sun > 0.78) return step(HOT, lit);
        if (sun > 0.62) return step(hash(i * 5 + j * 11) < 0.2 ? SEA : LIFE, lit);
        return step(ICE, lit + 0.1);
      } });
    },
  },
  {
    // The eleventh (Peter, 14 Oct: "one more planet or moon, so it's an even 5
    // each").
    id: 'twins', name: 'TWIN MOONS', R: 11,
    note: 'Two moons locked in orbit round each other — one icy and cracked, one rust-red and cratered — turning about a point between them as they cross, nearer one passing in front.',
    draw(c, x, y, R, t) {
      glow(c, x, y, R * 2.6, 'rgba(200,220,255,0.14)');
      const ICE = ['#3a4a5e', '#6e86a0', '#a8c0d6', '#d8e8f4', '#f8fcff'];
      const CRACK = ['#1e3a5a', '#2e5a86', '#4a82b0', '#6ea6d0', '#9ccbea'];
      const RUST = ['#2a1410', '#5a2a1c', '#8a4628', '#b8683a', '#dc9258'];
      const a = t * 0.4, d = R * 1.9;
      const bodies = [
        { r: R, dx: Math.cos(a) * d * 0.55, dz: Math.sin(a), paint: (la, lo, lit, i, j) => step(Math.abs(Math.sin(lo * 4 + la * 3)) < 0.18 ? CRACK : ICE, lit) },
        { r: R * 0.72, dx: -Math.cos(a) * d, dz: -Math.sin(a), paint: (la, lo, lit, i, j) => step(RUST, lit - (hash(i * 19 + j * 7 + 2) < 0.18 ? 0.2 : 0)) },
      ].sort((p, q) => p.dz - q.dz);
      for (const b of bodies) {
        sphere(c, x + b.dx, y + b.dz * R * 0.35, b.r * (1 + b.dz * 0.06), t * 0.1, { nLat: 9, nLon: 18, tilt: 0.3, paint: b.paint });
      }
    },
  },
  {
    id: 'battlemoon', name: 'THAT’S NO MOON', R: 15,
    note: 'A grey battle station disguised as a moon: panelled facets, a dark trench round the middle, and a great concave dish up top that glows green now and then.',
    draw(c, x, y, R, t) {
      const GREY = [['#1a1c20', '#3a3e44', '#62676e', '#90959c', '#c0c4c8'], ['#1c1e22', '#3e4248', '#686d74', '#979ca2', '#c8ccd0']];
      const charge = Math.max(0, Math.sin(t * 0.6)) ** 6;
      const spin = 0.4 + Math.sin(t * 0.04) * 0.2;
      sphere(c, x, y, R, spin, { nLat: 17, nLon: 34, tilt: 0.25, roll: -0.15, paint: (la, lo, lit, i, j) => {
        if (Math.abs(la) < 0.06) return '#0c0d10';
        // The dish: facets near (lat −0.55, lon −0.5) shade the wrong way, a bowl.
        const du = dLon(lo, -0.55), dv = la + 0.55, r = Math.hypot(du * Math.cos(la), dv);
        if (r < 0.36) {
          if (r < 0.08) return `rgba(${120 + 135 * charge},255,${120 + 60 * charge},1)`;
          return step(GREY[0], 0.55 - lit * 0.6 + charge * 0.3);
        }
        return step(GREY[(i + j) % 2], lit - (hash(i * 13 + j * 29) < 0.1 ? 0.15 : 0));
      } });
      if (charge > 0.05) glow(c, x - R * 0.36, y - R * 0.6, R * 0.9 * charge, `rgba(150,255,140,${0.6 * charge})`);
    },
  },
];
