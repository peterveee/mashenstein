// BREAKER BOX minigames: 7 tiny genre parodies. Shared framework: 35s timer
// (TURDLE gets 90 — the turtle insists words cannot be rushed), success/fail
// reported to onEnd. All are keyboard + touch playable.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawText, drawTextCentered, getSprite } from '../../engine/sprites.js';
import { drawProp } from '../../sprites/props.js';
import { Rng } from '../../engine/rng.js';
import { TURDLE_WORDS } from '../../data/words.js';

export const MINIGAMES = ['blocksurge', 'rewire', 'codeinject', 'paddlewar', 'mashinvaders', 'brickbonk', 'turdle'];
export const MINIGAME_NAMES = {
  blocksurge: 'BLOCK SURGE', rewire: 'REWIRE', codeinject: 'CODE INJECT',
  paddlewar: 'PADDLE WAR', mashinvaders: 'MASH INVADERS', brickbonk: 'BRICK BONK', turdle: 'TURDLE',
};

export class MinigameState {
  // opts: {game, seed, onEnd(success), settings}
  constructor(opts) { this.o = opts; }

  enter() {
    Input.setContext('minigame');
    this.game = makeGame(this.o.game, new Rng(this.o.seed ?? 1), this.o.settings || {});
    this.timer = this.o.game === 'turdle' ? 90 : 35;
    this.result = null;
    this.resultT = 0;
    this.reported = false;
    Audio.setBank(null);
    Input.setButtons(this.game.buttons ? this.game.buttons() : [
      { id: 'left', x: 8, y: H - 52, w: 40, h: 40, action: 'left', label: '<' },
      { id: 'right', x: 56, y: H - 52, w: 40, h: 40, action: 'right', label: '>' },
      { id: 'jump', x: W - 96, y: H - 52, w: 40, h: 40, action: 'jump', label: 'A' },
      { id: 'duck', x: W - 48, y: H - 52, w: 40, h: 40, action: 'duck', label: 'B' },
    ]);
    if (this.o.game === 'turdle') Input.textHandler = (code) => this.game.onKey && this.game.onKey(code);
  }

  exit() { Input.setContext('default'); Input.setButtons([]); Input.textHandler = null; }

  update(dt) {
    if (this.result != null) {
      this.resultT += dt;
      if (!this.reported && (this.resultT > 0.8 || Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('back'))) {
        this.reported = true;
        this.o.onEnd(this.result);
      }
      Input.endFrame();
      return;
    }
    if (Input.pressed('back')) {
      this.result = false;
      this.resultT = 0;
      Audio.sfx('lose');
      Input.endFrame();
      return;
    }
    this.timer -= dt;
    const status = this.game.update(dt, Input);
    if (status === true || status === false) {
      this.result = status;
      Audio.sfx(status ? 'win' : 'lose');
    } else if (this.timer <= 0) {
      this.result = false;
      Audio.sfx('lose');
    }
    Input.endFrame();
  }

  draw(ctx) {
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, W, H);
    // breaker-box frame
    ctx.strokeStyle = '#48e0c8';
    ctx.strokeRect(4.5, 4.5, W - 9, H - 9);
    drawTextCentered(ctx, `BREAKER BOX: ${MINIGAME_NAMES[this.o.game]}`, W / 2, 10, '#48e0c8');
    // timer bar
    const tmax = this.o.game === 'turdle' ? 90 : 35;
    ctx.fillStyle = '#20242c';
    ctx.fillRect(40, 22, W - 80, 4);
    ctx.fillStyle = this.timer < 6 ? '#e04848' : '#f6d33c';
    ctx.fillRect(40, 22, (W - 80) * Math.max(0, this.timer / tmax), 4);
    this.game.draw(ctx);
    if (this.result != null) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H / 2 - 24, W, 48);
      drawTextCentered(ctx, this.result ? 'POWER RESTORED' : 'THE BREAKER REMAINS UNIMPRESSED', W / 2, H / 2 - 8, this.result ? '#48c848' : '#e04848', 1);
      if (!this.result) drawTextCentered(ctx, 'A CHILD COULD REWIRE THAT. A CHILD.', W / 2, H / 2 + 6, '#8a8a98');
      else if (this.o.bonusText) drawTextCentered(ctx, this.o.bonusText, W / 2, H / 2 + 6, '#f6d33c');
    }
    // touch buttons
    for (const b of Input.buttons) {
      ctx.fillStyle = 'rgba(72,224,200,0.12)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      drawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 - 3, '#48e0c8');
    }
  }
}

function makeGame(id, rng, settings) {
  switch (id) {
    case 'blocksurge': return blockSurge(rng);
    case 'rewire': return rewire(rng);
    case 'codeinject': return codeInject(rng);
    case 'paddlewar': return paddleWar(rng);
    case 'mashinvaders': return mashInvaders(rng);
    case 'brickbonk': return brickBonk(rng);
    case 'turdle': return turdle(rng);
    default: return blockSurge(rng);
  }
}

// --- BLOCK SURGE: falling MASH-ominoes (deliberately NOT the classic seven) --
const MASHOMINOES = [
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],       // plus
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]],          // 2x2 with a nub
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],          // W-bend
  [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]],        // 1x5 plank
  [[-1, -1], [-1, 0], [0, 0], [1, 0], [1, -1]],      // U
  [[0, 0], [0, 1], [1, 1]],                          // small L (3 cells, mercy piece)
];
function blockSurge(rng) {
  const COLS = 7, ROWS = 10, CS = 14;
  const ox = W / 2 - (COLS * CS) / 2, oy = 40;
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let piece = null, px = 3, py = 0, rot = 0, dropT = 0, lines = 0, fallSpeed = 0.55;
  function cells() {
    return piece.map(([cx, cy]) => {
      let x = cx, y = cy;
      for (let r = 0; r < rot % 4; r++) { const t = x; x = -y; y = t; }
      return [px + x, py + y];
    });
  }
  function fits(dx = 0, dy = 0, dr = 0) {
    const saveR = rot; rot += dr;
    const ok = cells().every(([x, y]) => x + dx >= 0 && x + dx < COLS && y + dy < ROWS && (y + dy < 0 || !grid[y + dy][x + dx]));
    rot = saveR;
    return ok;
  }
  function spawn() { piece = rng.pick(MASHOMINOES); px = 3; py = 0; rot = 0; if (!fits()) return false; return true; }
  spawn();
  return {
    update(dt, input) {
      if (input.pressed('left') && fits(-1, 0)) px--;
      if (input.pressed('right') && fits(1, 0)) px++;
      if (input.pressed('jump') && fits(0, 0, 1)) { rot++; Audio.sfx('ui'); }
      dropT += dt * (input.held('duck') ? 6 : 1);
      if (dropT > fallSpeed) {
        dropT = 0;
        if (fits(0, 1)) py++;
        else {
          for (const [x, y] of cells()) if (y >= 0 && y < ROWS) grid[y][x] = 1;
          for (let y = ROWS - 1; y >= 0; y--) {
            if (grid[y].every((v) => v)) {
              grid.splice(y, 1);
              grid.unshift(Array(COLS).fill(0));
              lines++; y++;
              Audio.sfx('coin');
            }
          }
          if (lines >= 2) return true;
          if (!spawn()) return false;
        }
      }
    },
    draw(ctx) {
      drawTextCentered(ctx, `CLEAR 2 LINES: ${lines}/2`, W / 2, 30, '#c8e0ff');
      ctx.strokeStyle = '#48e0c8';
      ctx.strokeRect(ox - 1.5, oy - 1.5, COLS * CS + 3, ROWS * CS + 3);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (grid[y][x]) { ctx.fillStyle = '#8858c8'; ctx.fillRect(ox + x * CS, oy + y * CS, CS - 1, CS - 1); }
      }
      if (piece) {
        ctx.fillStyle = '#f6d33c';
        for (const [x, y] of cells()) if (y >= 0) ctx.fillRect(ox + x * CS, oy + y * CS, CS - 1, CS - 1);
      }
      drawText(ctx, 'THESE ARE NOT THE', ox + COLS * CS + 12, 60, '#5a5a68');
      drawText(ctx, 'SHAPES YOU KNOW.', ox + COLS * CS + 12, 70, '#5a5a68');
      drawText(ctx, 'LEGALLY.', ox + COLS * CS + 12, 80, '#5a5a68');
    },
  };
}

// --- REWIRE: rotate pipe tiles, connect plug (left) to socket (right) -------
function rewire(rng) {
  const COLS = 5, ROWS = 4, CS = 30;
  const ox = W / 2 - (COLS * CS) / 2, oy = 60;
  // tile types: 0 empty, 1 straight (E-W at rot 0), 2 elbow (E-S at rot 0)
  const tiles = [];
  for (let y = 0; y < ROWS; y++) {
    tiles.push([]);
    for (let x = 0; x < COLS; x++) tiles[y].push({ t: rng.pick([1, 1, 2, 2]), rot: rng.int(0, 3) });
  }
  const inY = rng.int(0, ROWS - 1), outY = rng.int(0, ROWS - 1);
  let cursor = { x: 0, y: 0 };
  function ports(tile) {
    // returns [N,E,S,W] booleans after rotation
    let base = tile.t === 1 ? [false, true, false, true] : [false, true, true, false];
    for (let r = 0; r < tile.rot % 4; r++) base = [base[3], base[0], base[1], base[2]];
    return base;
  }
  function connected() {
    // BFS from (0, inY) entering from West.
    const seen = new Set();
    const stack = [];
    const t0 = tiles[inY][0];
    if (ports(t0)[3]) stack.push([0, inY]);
    while (stack.length) {
      const [x, y] = stack.pop();
      const key = x + ',' + y;
      if (seen.has(key)) continue;
      seen.add(key);
      const p = ports(tiles[y][x]);
      if (x === COLS - 1 && y === outY && p[1]) return true;
      const dirs = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
      for (const [dx, dy, mine, theirs] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (!p[mine] || nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        if (ports(tiles[ny][nx])[theirs]) stack.push([nx, ny]);
      }
    }
    return false;
  }
  return {
    update(dt, input) {
      if (input.pressed('left')) cursor.x = (cursor.x + COLS - 1) % COLS;
      if (input.pressed('right')) cursor.x = (cursor.x + 1) % COLS;
      if (input.pressed('duck')) cursor.y = (cursor.y + 1) % ROWS;
      if (input.pressed('jump')) { tiles[cursor.y][cursor.x].rot++; Audio.sfx('ui'); if (connected()) return true; }
      if (input.pressed('pointer')) {
        const p = input.pointer;
        const gx = Math.floor((p.x - ox) / CS), gy = Math.floor((p.y - oy) / CS);
        if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
          tiles[gy][gx].rot++;
          cursor = { x: gx, y: gy };
          Audio.sfx('ui');
          if (connected()) return true;
        }
      }
    },
    draw(ctx) {
      drawTextCentered(ctx, 'ROUTE THE CURRENT. ROTATE TILES.', W / 2, 34, '#c8e0ff');
      // plug + socket
      ctx.fillStyle = '#f6d33c';
      ctx.fillRect(ox - 16, oy + inY * CS + CS / 2 - 4, 14, 8);
      ctx.fillStyle = '#48c848';
      ctx.fillRect(ox + COLS * CS + 2, oy + outY * CS + CS / 2 - 4, 14, 8);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const tile = tiles[y][x];
        const tx = ox + x * CS, ty = oy + y * CS;
        ctx.strokeStyle = (cursor.x === x && cursor.y === y) ? '#f6d33c' : '#30303f';
        ctx.strokeRect(tx + 0.5, ty + 0.5, CS - 1, CS - 1);
        const p = tiles[y][x];
        const port = (function () { let base = p.t === 1 ? [0, 1, 0, 1] : [0, 1, 1, 0]; for (let r = 0; r < p.rot % 4; r++) base = [base[3], base[0], base[1], base[2]]; return base; })();
        ctx.strokeStyle = '#48e0c8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const cx = tx + CS / 2, cy = ty + CS / 2;
        if (port[0]) { ctx.moveTo(cx, cy); ctx.lineTo(cx, ty); }
        if (port[1]) { ctx.moveTo(cx, cy); ctx.lineTo(tx + CS, cy); }
        if (port[2]) { ctx.moveTo(cx, cy); ctx.lineTo(cx, ty + CS); }
        if (port[3]) { ctx.moveTo(cx, cy); ctx.lineTo(tx, cy); }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      drawTextCentered(ctx, 'TAP A TILE OR ARROWS + A TO ROTATE', W / 2, oy + ROWS * CS + 10, '#5a5a68');
    },
  };
}

// --- CODE INJECT: Simon with the four action inputs --------------------------
function codeInject(rng) {
  const ACTIONS = ['jump', 'duck', 'left', 'right'];
  const LABELS = { jump: 'A', duck: 'B', left: '<', right: '>' };
  const COLORS = { jump: '#48c848', duck: '#e04848', left: '#4890f0', right: '#f6d33c' };
  let seq = [rng.pick(ACTIONS), rng.pick(ACTIONS), rng.pick(ACTIONS), rng.pick(ACTIONS)];
  let showIdx = 0, showT = 0, phase = 'show', inputIdx = 0, round = 0;
  const TARGET_LEN = 7;
  return {
    update(dt, input) {
      if (phase === 'show') {
        showT += dt;
        if (showT > 0.55) { showT = 0; showIdx++; if (showIdx >= seq.length) { phase = 'input'; inputIdx = 0; } }
      } else {
        for (const a of ACTIONS) {
          if (input.pressed(a)) {
            if (a === seq[inputIdx]) {
              inputIdx++;
              Audio.sfx('ui');
              if (inputIdx >= seq.length) {
                if (seq.length >= TARGET_LEN) return true;
                seq.push(rng.pick(ACTIONS));
                round++;
                phase = 'show'; showIdx = 0; showT = -0.4;
                Audio.sfx('uiConfirm');
              }
            } else {
              Audio.sfx('uiBad');
              phase = 'show'; showIdx = 0; showT = -0.6; inputIdx = 0;
            }
          }
        }
      }
    },
    draw(ctx) {
      drawTextCentered(ctx, `REPEAT THE SEQUENCE. GROW IT TO ${TARGET_LEN}.`, W / 2, 34, '#c8e0ff');
      drawTextCentered(ctx, `LENGTH: ${seq.length}/${TARGET_LEN}`, W / 2, 46, '#8a8a98');
      // pads
      ACTIONS.forEach((a, i) => {
        const x = W / 2 - 90 + i * 48, y = 120;
        const lit = phase === 'show' && showIdx < seq.length && seq[showIdx] === a && showT > 0 && showT < 0.4;
        ctx.fillStyle = lit ? COLORS[a] : '#20242c';
        ctx.fillRect(x, y, 40, 40);
        ctx.strokeStyle = COLORS[a];
        ctx.strokeRect(x + 0.5, y + 0.5, 40, 40);
        drawTextCentered(ctx, LABELS[a], x + 20, y + 16, lit ? '#0b0b14' : COLORS[a], 2);
      });
      if (phase === 'input') {
        drawTextCentered(ctx, `YOUR TURN: ${inputIdx}/${seq.length}`, W / 2, 180, '#48e0c8');
      } else {
        drawTextCentered(ctx, 'WATCH. THE CODE IS WATCHING BACK.', W / 2, 180, '#5a5a68');
      }
    },
  };
}

// --- PADDLE WAR: one-point pong vs Eggshell ---------------------------------
function paddleWar(rng) {
  const py0 = 60, py1 = H - 60;
  let my = H / 2, ey = H / 2;
  let bx = W / 2, by = H / 2, bvx = 120 * (rng.chance(0.5) ? 1 : -1), bvy = rng.range(-60, 60);
  let taunt = 0;
  return {
    buttons: () => [
      { id: 'up', x: W - 48, y: 40, w: 40, h: 70, action: 'jump', label: 'UP' },
      { id: 'down', x: W - 48, y: H - 110, w: 40, h: 70, action: 'duck', label: 'DN' },
    ],
    update(dt, input) {
      taunt += dt;
      if (input.held('jump') || input.held('left')) my -= 140 * dt;
      if (input.held('duck') || input.held('right')) my += 140 * dt;
      my = Math.max(50, Math.min(H - 50, my));
      // Eggshell AI: confident, imperfect.
      const targetY = by + Math.sin(taunt * 2) * 18;
      ey += Math.max(-95 * dt, Math.min(95 * dt, targetY - ey));
      bx += bvx * dt; by += bvy * dt;
      if (by < 34 || by > H - 12) bvy = -bvy;
      const speedup = 1.035;
      if (bx < 30 && Math.abs(by - my) < 22 && bvx < 0) { bvx = -bvx * speedup; bvy += (by - my) * 4; Audio.sfx('ui'); }
      if (bx > W - 30 && Math.abs(by - ey) < 24 && bvx > 0) { bvx = -bvx * speedup; bvy += (by - ey) * 3; Audio.sfx('ui'); }
      if (bx < 8) return false;
      if (bx > W - 8) return true;
    },
    draw(ctx) {
      drawTextCentered(ctx, 'FIRST POINT WINS. HIS PADDLE IS HIS SHELL.', W / 2, 34, '#c8e0ff');
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#30303f';
      ctx.beginPath(); ctx.moveTo(W / 2, 34); ctx.lineTo(W / 2, H - 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(22, my - 20, 5, 40);
      // Eggshell's shell paddle
      ctx.fillStyle = '#48c848';
      ctx.fillRect(W - 27, ey - 22, 6, 44);
      ctx.fillStyle = '#2a8a2a';
      for (let i = 0; i < 4; i++) ctx.fillRect(W - 25, ey - 18 + i * 10, 2, 4);
      ctx.fillStyle = '#f6d33c';
      ctx.fillRect(bx - 3, by - 3, 6, 6);
      if (Math.floor(taunt / 4) % 2 === 0) drawTextCentered(ctx, '"I INVENTED PONG." - EGGSHELL', W / 2, H - 18, '#5a5a68');
    },
  };
}

// --- MASH INVADERS: one wave of descending vacuums ---------------------------
function mashInvaders(rng) {
  let px = W / 2;
  const inv = [];
  for (let i = 0; i < 8; i++) inv.push({ x: 90 + (i % 4) * 80, y: 50 + Math.floor(i / 4) * 30, live: true });
  let dir = 1, shots = [], cd = 0;
  return {
    update(dt, input) {
      if (input.held('left')) px -= 150 * dt;
      if (input.held('right')) px += 150 * dt;
      px = Math.max(20, Math.min(W - 20, px));
      cd -= dt;
      if (input.pressed('jump') && cd <= 0) { cd = 0.35; shots.push({ x: px, y: H - 40 }); Audio.sfx('shoot'); }
      let edge = false;
      for (const v of inv) {
        if (!v.live) continue;
        v.x += dir * 40 * dt;
        if (v.x > W - 30 || v.x < 30) edge = true;
      }
      if (edge) { dir = -dir; for (const v of inv) if (v.live) v.y += 12; }
      for (const s of shots) {
        s.y -= 220 * dt;
        for (const v of inv) {
          if (v.live && Math.abs(v.x - s.x) < 10 && Math.abs(v.y - s.y) < 9) {
            v.live = false; s.y = -99; Audio.sfx('crunch');
          }
        }
      }
      shots = shots.filter((s) => s.y > -10);
      if (inv.every((v) => !v.live)) return true;
      if (inv.some((v) => v.live && v.y > H - 60)) return false;
    },
    draw(ctx) {
      drawTextCentered(ctx, 'CLEAR THE WAVE OF DUST DEVILS.', W / 2, 34, '#c8e0ff');
      for (const v of inv) {
        if (!v.live) continue;
        drawProp(ctx, 'dustdevil', Math.round(v.x - 7), Math.round(v.y - 6), 14, 12);
      }
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(px - 8, H - 36, 16, 8);
      ctx.fillRect(px - 2, H - 42, 4, 6);
      ctx.fillStyle = '#f6d33c';
      for (const s of shots) ctx.fillRect(s.x - 1, s.y - 4, 2, 6);
    },
  };
}

// --- BRICK BONK: breakout; the wall is Eggshell's mustache -------------------
function brickBonk(rng) {
  const bricks = [];
  // mustache shape (two swoops), 14 cols x 5 rows mask
  const MASK = [
    '..XXX....XXX..',
    '.XXXXX..XXXXX.',
    'XXXXXXXXXXXXXX',
    'XXXX.XXXX.XXXX',
    '.XX........XX.',
  ];
  MASK.forEach((row, ry) => {
    row.split('').forEach((ch, rx) => {
      if (ch === 'X') bricks.push({ x: 70 + rx * 24, y: 46 + ry * 14, hp: ry === 2 ? 2 : 1, live: true });
    });
  });
  const total = bricks.length;
  let px = W / 2, bx = W / 2, by = H - 70, bvx = 90, bvy = -150;
  return {
    update(dt, input) {
      if (input.held('left')) px -= 170 * dt;
      if (input.held('right')) px += 170 * dt;
      if (input.pointer.down) px += Math.max(-170 * dt, Math.min(170 * dt, input.pointer.x - px));
      px = Math.max(30, Math.min(W - 30, px));
      bx += bvx * dt; by += bvy * dt;
      if (bx < 12 || bx > W - 12) bvx = -bvx;
      if (by < 34) bvy = Math.abs(bvy);
      if (by > H - 46 && by < H - 38 && Math.abs(bx - px) < 26 && bvy > 0) {
        bvy = -Math.abs(bvy) * 1.02;
        bvx += (bx - px) * 3;
        Audio.sfx('ui');
      }
      if (by > H - 8) { by = H - 70; bvy = -150; bvx = rng.range(-90, 90); Audio.sfx('uiBad'); }
      for (const b of bricks) {
        if (b.live && Math.abs(bx - (b.x + 11)) < 14 && Math.abs(by - (b.y + 6)) < 9) {
          b.hp--; if (b.hp <= 0) b.live = false;
          bvy = -bvy;
          Audio.sfx('crunch');
          break;
        }
      }
      const smashed = bricks.filter((b) => !b.live).length;
      if (smashed / total >= 0.4) return true;
    },
    draw(ctx) {
      const smashed = bricks.filter((b) => !b.live).length;
      drawTextCentered(ctx, `SMASH 40% OF THE MUSTACHE: ${Math.floor((smashed / total) * 100)}%`, W / 2, 34, '#c8e0ff');
      for (const b of bricks) {
        if (!b.live) continue;
        ctx.fillStyle = b.hp > 1 ? '#8a2020' : '#c83030';
        ctx.fillRect(b.x, b.y, 22, 12);
        ctx.strokeStyle = '#5a1414';
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, 22, 12);
      }
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(px - 24, H - 42, 48, 6);
      // the ball is a coin
      drawProp(ctx, 'coin', Math.round(bx - 4), Math.round(by - 4), 8, 8);
    },
  };
}

// --- TURDLE: 4 letters, 4 guesses, one unimpressed turtle --------------------
function turdle(rng) {
  const answer = rng.pick(TURDLE_WORDS);
  const guesses = [];
  let current = '';
  let shakeT = 0;
  const kbRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  function scoreGuess(g) {
    // correct / present / absent with duplicate handling
    const res = Array(4).fill('absent');
    const remaining = {};
    for (let i = 0; i < 4; i++) {
      if (g[i] === answer[i]) res[i] = 'correct';
      else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
    for (let i = 0; i < 4; i++) {
      if (res[i] === 'correct') continue;
      if (remaining[g[i]] > 0) { res[i] = 'present'; remaining[g[i]]--; }
    }
    return res;
  }
  function submit() {
    if (current.length !== 4) { shakeT = 0.3; Audio.sfx('uiBad'); return null; }
    const res = scoreGuess(current);
    guesses.push({ word: current, res });
    Audio.sfx('uiConfirm');
    const won = current === answer;
    current = '';
    if (won) return true;
    if (guesses.length >= 4) return false;
    return null;
  }
  const api = {
    onKey(code) {
      if (code === 'Enter') { api._pending = submit(); }
      else if (code === 'Backspace') { current = current.slice(0, -1); Audio.sfx('type'); }
      else if (current.length < 4) { current += code.replace('Key', ''); Audio.sfx('type'); }
    },
    buttons: () => [],
    update(dt, input) {
      if (shakeT > 0) shakeT -= dt;
      if (api._pending != null) { const p = api._pending; api._pending = null; return p; }
      if (input.pressed('pointer')) {
        const p = input.pointer;
        // on-screen keyboard hit test
        kbRows.forEach((row, ry) => {
          const rw = row.length * 16;
          const x0 = W / 2 - rw / 2;
          const y0 = 180 + ry * 18;
          if (p.y >= y0 && p.y < y0 + 16) {
            const idx = Math.floor((p.x - x0) / 16);
            if (idx >= 0 && idx < row.length && current.length < 4) { current += row[idx]; Audio.sfx('type'); }
          }
        });
        // ENTER / DEL zones
        if (p.y >= 180 + 3 * 18 && p.y < 180 + 3 * 18 + 16) {
          if (p.x < W / 2 - 20) api._pending = submit();
          else if (p.x > W / 2 + 20) { current = current.slice(0, -1); Audio.sfx('type'); }
        }
      }
      if (input.pressed('confirm')) { api._pending = submit(); }
    },
    draw(ctx) {
      drawTextCentered(ctx, '4 LETTERS. 4 GUESSES. THE TURTLE WAITS.', W / 2, 32, '#c8e0ff');
      const colors = { correct: '#48c848', present: '#f6d33c', absent: '#3a3a48' };
      const marks = { correct: '=', present: '?', absent: '' };
      for (let g = 0; g < 4; g++) {
        for (let i = 0; i < 4; i++) {
          const x = W / 2 - 44 + i * 24 + (g === guesses.length && shakeT > 0 ? Math.sin(shakeT * 60) * 2 : 0);
          const y = 46 + g * 26;
          const guess = guesses[g];
          ctx.fillStyle = guess ? colors[guess.res[i]] : '#181820';
          ctx.fillRect(x, y, 20, 20);
          ctx.strokeStyle = '#30303f';
          ctx.strokeRect(x + 0.5, y + 0.5, 20, 20);
          const letter = guess ? guess.word[i] : (g === guesses.length ? (current[i] || '') : '');
          if (letter) drawTextCentered(ctx, letter, x + 10, y + 6, guess && guess.res[i] !== 'absent' ? '#0b0b14' : '#e8e8f0');
          if (guess && marks[guess.res[i]]) drawText(ctx, marks[guess.res[i]], x + 14, y + 13, '#0b0b14');
        }
      }
      // the turtle. profoundly unimpressed. wearing eggshell's spare shell.
      const tx = W / 2 + 78, ty = 70;
      ctx.fillStyle = '#48c848';
      ctx.fillRect(tx, ty + 4, 22, 12);
      ctx.fillStyle = '#2a8a2a';
      for (let i = 0; i < 3; i++) ctx.fillRect(tx + 3 + i * 6, ty + 6, 3, 3);
      ctx.fillStyle = '#9ec89e';
      ctx.fillRect(tx + 20, ty + 6, 8, 7);
      ctx.fillStyle = '#1a1028';
      ctx.fillRect(tx + 25, ty + 8, 2, 1); // half-lidded eye
      drawText(ctx, guesses.length >= 3 ? 'HM.' : '...', tx + 4, ty - 8, '#8a8a98');
      // on-screen keyboard
      kbRows.forEach((row, ry) => {
        const rw = row.length * 16;
        const x0 = W / 2 - rw / 2;
        const y0 = 180 + ry * 18;
        row.split('').forEach((ch, i) => {
          ctx.fillStyle = '#20242c';
          ctx.fillRect(x0 + i * 16, y0, 14, 16);
          drawTextCentered(ctx, ch, x0 + i * 16 + 7, y0 + 5, '#c8c8d8');
        });
      });
      drawTextCentered(ctx, 'ENTER', W / 2 - 60, 180 + 3 * 18 + 4, '#48c848');
      drawTextCentered(ctx, 'DELETE', W / 2 + 60, 180 + 3 * 18 + 4, '#e04848');
    },
  };
  return api;
}
