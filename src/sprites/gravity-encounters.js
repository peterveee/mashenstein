// Gameplay-owned props and ambience. The station painting remains independent.
const INK = '#14222b', STEEL = '#526b79', LIGHT = '#d9ece7';
const GOLD = '#e8b947', PURPLE = '#b072cb', HOT = '#ff8061';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function box(c, x, y, w, h, fill, r = 1.5) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
}
function line(c, x, y, xx, yy, color, width) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function disc(c, x, y, radius, color) {
  c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fillStyle = color; c.fill();
  c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
}
function tape(c, x, y, w, h) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = GOLD; c.fillRect(x, y, w, h);
  for (let xx = x - h; xx < x + w; xx += 9) line(c, xx, y + h, xx + h, y, INK, 3);
  c.restore();
}

export function drawFloatingBolts(c, cam, view, t, corridor) {
  // Small, plentiful loose hardware drifting behind both playable rails.
  // World-indexed parallax avoids pops when the camera crosses a wrap boundary.
  // More of them and smaller (Peter, 13 Oct): one every 12 units, about two
  // thirds the old size, a third of them a touch bigger for variety.
  const travel = cam * 0.22, step = 12;
  c.save(); c.globalAlpha = 0.64;
  for (let i = Math.floor((travel - 28) / step) - 1; i * step < travel + view + step + 28; i++) {
    const seed = Math.sin(i * 12.9898 + 4.3) * 43758.5453;
    const f = seed - Math.floor(seed);
    const x = i * step - travel + 18 * Math.sin(t * (0.5 + f * 0.2) + i)
      + 5 * Math.sin(t * 0.29 + i * 2.7);
    const y = -corridor * (0.3 + f * 0.42) + Math.sin(t * 0.75 + i * 2.1) * 12
      + Math.cos(t * 0.34 + i) * 5;
    c.save(); c.translate(x, y); c.rotate(t * (0.45 + f * 0.4) * (i % 2 ? -1 : 1) + i * 1.4);
    const size = (0.24 + f * 0.16) * (i % 5 === 0 ? 1.3 : 1); c.scale(size, size);
    if (i % 3 === 0) {
      c.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = j * Math.PI / 3, xx = Math.cos(a) * 3.6, yy = Math.sin(a) * 3.6;
        if (j) c.lineTo(xx, yy); else c.moveTo(xx, yy);
      }
      c.closePath(); c.fillStyle = '#9fb9bb'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      disc(c, 0, 0, 1.4, '#28494d');
    } else {
      box(c, -1.15, -1, 2.3, 7, '#8ba7af', 0.3);
      for (let j = 0; j < 4; j++) line(c, -1.5, j * 1.4, 1.5, j * 1.4 - 0.6, '#d2e0db', 0.55);
      box(c, -3, -3.5, 6, 3, LIGHT, 0.8);
      line(c, -1.7, -2.8, 1.7, -2.8, '#ffffff', 0.6);
    }
    c.restore();
  }
  c.restore();
}

export function drawGravityHazard(c, e, x, bottom, t) {
  if (x + e.w < -12 || x > 520) return;
  c.save(); c.translate(x, bottom); c.lineJoin = 'round'; c.lineCap = 'round';
  if (e.type === 'floatSpikes') {
    box(c, -1, -2, e.w + 2, 3, STEEL, 0.7);
    const n = Math.max(3, Math.round(e.w / 7)), step = e.w / n;
    for (let i = 0; i < n; i++) {
      const xx = i * step;
      c.beginPath(); c.moveTo(xx, -2); c.lineTo(xx + step / 2, -10); c.lineTo(xx + step, -2); c.closePath();
      c.fillStyle = LIGHT; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
      line(c, xx + step / 2, -8, xx + step - 1, -2.5, '#6f929d', 1.2);
    }
    tape(c, 0, 0, e.w, 1.8);
  } else if (e.type === 'floatLaser') {
    box(c, -1, -2, e.w + 2, 3, '#243540', 0.8);
    tape(c, 0, 0, e.w, 2);
    for (const xx of [0, e.w - 6]) {
      box(c, xx, -10, 6, 10, STEEL, 1);
      disc(c, xx + 3, -6, 1.8, '#ffc2a8');
    }
    line(c, 5, -6, e.w - 5, -6, '#b42e33', 5);
    line(c, 5, -6, e.w - 5, -6, '#ff654c', 3);
    line(c, 5, -6, e.w - 5, -6, '#fff0c7', 1.2);
    // Travelling energy knots make the continuous live beam easy to read.
    for (let xx = 8 + (t * 30 % 24); xx < e.w - 6; xx += 24) disc(c, xx, -6, 1.2, '#fff3d5');
  } else if (e.type === 'maintenanceBrush') {
    // Art clears the upright head in the game's tall slide pose. The standard
    // 13px underside collision still catches standing, clears ducking.
    const lift = 8, h = e.h;
    box(c, 0, -h - lift, e.w, h, '#684580', 3);
    for (let i = 3; i < e.w - 2; i += 2.2) {
      const phase = t * 16 + i;
      line(c, i, -h - lift + 2, i + Math.sin(phase) * 1.4, -lift - 1, i % 4 < 2 ? PURPLE : '#d7a4e4', 1.4);
    }
    box(c, -3, -h - lift + 1, 6, h - 2, GOLD, 2);
    disc(c, 0, -h / 2 - lift, 3, STEEL);
    box(c, e.w - 2, -h - lift + 1, 5, h - 2, GOLD, 2);
    box(c, 1, -h - lift - 3, e.w - 2, 4, STEEL);
    tape(c, 4, -h - lift - 2.5, e.w - 8, 2.5);
  } else if (e.type === 'maintenancePulse') {
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([i * e.w / 8, -3.5 + Math.sin(i * 2.6 + t * 24) * 2.2]);
    for (const [col, width] of [['#654294', 5], [PURPLE, 3], ['#fff0ff', 1]]) {
      c.beginPath(); pts.forEach(([xx, yy], i) => i ? c.lineTo(xx, yy) : c.moveTo(xx, yy));
      c.strokeStyle = col; c.lineWidth = width; c.stroke();
    }
    disc(c, 1, -3.5, 2, LIGHT); disc(c, e.w - 1, -3.5, 2, LIGHT);
  } else if (e.type === 'maintenanceRollers') {
    // Exposed counter-rotating cutter drums. Teeth break the upper silhouette;
    // no protective bar or fan spokes suggest a safe surface to stand on.
    box(c, -1, -e.h + 4, e.w + 2, e.h - 3, '#243540', 1);
    c.save(); c.beginPath(); c.rect(0, -e.h - 1, e.w, e.h + 2); c.clip();
    let drum = 0;
    for (let xx = 10; xx < e.w + 12; xx += 20, drum++) {
      const turn = t * 3.8 * (drum % 2 ? -1 : 1);
      c.save(); c.translate(xx, -11); c.rotate(turn);
      c.beginPath();
      for (let j = 0; j < 12; j++) {
        const a = j * Math.PI / 6;
        for (const [offset, radius] of [[0, 8.2], [0.1, 11], [0.31, 11], [0.4, 8.2]]) {
          const px = Math.cos(a + offset) * radius, py = Math.sin(a + offset) * radius;
          if (j === 0 && offset === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
      }
      c.closePath(); c.fillStyle = '#d6e1df'; c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      disc(c, 0, 0, 7, '#8d4b3b'); disc(c, 0, 0, 4.5, '#e37445');
      for (let j = 0; j < 3; j++) {
        const a = j * Math.PI * 2 / 3;
        disc(c, Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0.8, INK);
      }
      disc(c, 0, 0, 1.8, STEEL); c.restore();
      // A few small sparks where neighbouring cutters bite together.
      if (drum % 3 === 0) {
        const age = (t * 2 + drum * 0.37) % 1;
        c.save(); c.globalAlpha = 1 - age;
        line(c, xx + 9 + age * 3, -15 - age * 7,
          xx + 10 + age * 4, -16 - age * 8, '#ffd780', 0.7);
        c.restore();
      }
    }
    c.restore(); tape(c, 0, -1, e.w, 3);

  }
  c.restore();
}

export function drawMaintenanceRobot(c, { cam, view, time, seconds, corridor, playerX, hazards, sequences }) {
  const last = sequences.at(-1).end;
  if (seconds < 0.5 || seconds > last + 2) return;
  const arrival = clamp((2 - seconds) / 1.5, 0, 1);
  const departure = clamp((seconds - last) / 2, 0, 1);
  const x = Math.min(view - 25, playerX + 104) + (arrival + departure) * (view + 60);
  const y = -corridor + 32;
  const attack = hazards.filter(e => e.live && e.def.gravityArt && e.gravityAt >= seconds - (e.type === 'maintenanceRollers' ? 2.6 : 0.65))
    .sort((a, b) => a.gravityAt - b.gravityAt)[0];
  const active = attack && attack.gravityAt - seconds < 2.2 && seconds < last;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // Carriage, suspended from its own slim track, always behind the hero.
  line(c, 0, -corridor + 8, view + 40, -corridor + 8, INK, 4);
  line(c, 0, -corridor + 8, view + 40, -corridor + 8, '#94acb1', 1.6);
  for (const dx of [-17, 17]) {
    line(c, x + dx, -corridor + 10, x + dx, y - 4, STEEL, 4);
    disc(c, x + dx, -corridor + 9, 4, STEEL); disc(c, x + dx, -corridor + 9, 1.8, LIGHT);
  }
  // The tool itself is a colliding entity; its arm meets the same coordinates.
  let tx = x - 25, ty = y + 18;
  if (active) {
    // A pulse leaves a grounded emitter; the arm does not chase the spark.
    tx = attack.type === 'maintenancePulse' ? x - 28
      : attack.x - cam + Math.min(attack.w / 2, 20);
    const localAlt = attack.gravityCeiling != null ? corridor - attack.alt - attack.h : attack.alt;
    const reach = localAlt + attack.h + (attack.type === 'maintenanceBrush' ? 10 : 1);
    ty = attack.gravityCeiling != null ? -corridor + reach : -reach;
  }
  const ex = x - 23, ey = y + 18;
  for (const [color, width] of [[INK, 8], [GOLD, 5.5], ['#ffdf8c', 1]]) {
    line(c, x - 15, y + 4, ex, ey, color, width);
    line(c, ex, ey, tx, ty, color, width);
  }
  disc(c, ex, ey, 4, STEEL); disc(c, tx, ty, 3, STEEL);
  if (active && attack.type === 'maintenancePulse') {
    box(c, tx - 5, ty - 3, 10, 6, STEEL, 2);
    disc(c, tx - 4, ty, 1.5, '#eed5ff');
  }
  box(c, x - 21, y - 13, 42, 28, GOLD, 7);
  box(c, x - 16, y - 9, 32, 19, '#172d36', 5);
  const blink = Math.sin(time * 1.3) > 0.992;
  for (const dx of [-7, 7]) box(c, x + dx - 2, y - 5, 4, blink ? 1.4 : 8, active ? '#ffbd62' : '#a3f3d7', 1.7);
  tape(c, x - 17, y + 12, 34, 4);
  for (const dx of [-19, 19]) disc(c, x + dx, y, 1.2, LIGHT);
  c.restore();
}
